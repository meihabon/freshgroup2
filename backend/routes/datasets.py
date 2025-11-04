from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_honors, classify_income
from utils_complete import filter_complete_students_df, is_record_complete_row
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from kneed import KneeLocator
import pandas as pd
import os, uuid, json
from datetime import datetime
from typing import List
from fastapi.responses import StreamingResponse
import csv
import io
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from .users import log_activity, resolve_user

router = APIRouter()
os.makedirs("uploads", exist_ok=True)

# --- Helper: Normalize & Prepare DataFrame ---
def normalize_and_prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()

    # Map common variations
    col_map = {
        "sex": "sex", "gender": "sex",
        "program": "program", "course": "program",
        "municipality": "municipality", "city": "municipality",
        "income": "income", "family income": "income",
        "shs_type": "shs_type", "senior high": "shs_type",
        "shs_origin": "shs_origin", "shs origin": "shs_origin",
        "senior high school": "shs_origin", "senior high school name": "shs_origin",
        "school origin": "shs_origin", "shs_school": "shs_origin",
        "high school": "shs_origin", "school": "shs_origin",
        "gwa": "gwa", "general weighted average": "gwa",
        "firstname": "firstname", "first name": "firstname", "fname": "firstname",
        "lastname": "lastname", "last name": "lastname", "surname": "lastname", "lname": "lastname",
        "name": "name", "fullname": "name", "student name": "name"
    }
    df = df.rename(columns={col: col_map[col] for col in df.columns if col in col_map})

    # ✅ Handle case: dataset has only `name` instead of firstname/lastname
    if "name" in df.columns and ("firstname" not in df.columns or "lastname" not in df.columns):
        name_split = df["name"].astype(str).str.strip().str.split(" ", n=1, expand=True)
        df["firstname"] = name_split[0]
        df["lastname"] = name_split[1] if name_split.shape[1] > 1 else ""

    # ✅ Ensure required columns exist (added missing comma before gwa)
    required_cols = [
        "firstname", "lastname", "sex", "program", "municipality",
        "income", "shs_type", "shs_origin", "gwa"
    ]
    for col in required_cols:
        if col not in df.columns:
            df[col] = None

    # Derive Honors & IncomeCategory
    df["Honors"] = df.apply(classify_honors, axis=1)
    df["IncomeCategory"] = df["income"].apply(classify_income)

    # Clean numerics
    df["gwa"] = pd.to_numeric(df["gwa"], errors="coerce")
    df["income"] = pd.to_numeric(df["income"], errors="coerce")

    # ✅ Fixed indentation here
    categorical_cols = ["sex", "program", "municipality", "shs_type", "shs_origin"]

    for col in categorical_cols:
        enc_col = f"{col}_enc"
        try:
            le = LabelEncoder()
            df[col] = df[col].fillna("Unknown").replace("", "Unknown")
            df[enc_col] = le.fit_transform(df[col].astype(str))
        except Exception:
            uniques = {
                v: i for i, v in enumerate(
                    df[col].fillna("Unknown").replace("", "Unknown").astype(str).unique()
                )
            }
            df[enc_col] = df[col].astype(str).map(uniques)

    return df


# --- Elbow Helper Functions ---
def compute_wcss_for_range(X_scaled, k_min=2, k_max=10) -> List[float]:
    wcss = []
    for k in range(k_min, k_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        wcss.append(float(kmeans.inertia_))
    return wcss

def recommend_k_by_curvature(wcss: List[float], k_min=2) -> int:
    try:
        kneedle = KneeLocator(
            range(k_min, k_min + len(wcss)),
            wcss,
            curve="convex",
            direction="decreasing"
        )
        if kneedle.knee is not None:
            return int(kneedle.knee)
    except Exception:
        pass
    return max(2, min(5, len(wcss) // 2))  # fallback default

# -----------------------------
# Elbow Preview
# -----------------------------
@router.post("/datasets/elbow")
async def elbow_preview(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can compute elbow preview")

    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path, dtype={"income": "float64", "gwa": "float64"}, low_memory=False)
        else:
            df = pd.read_excel(file_path)

        df = normalize_and_prepare_df(df)

        # determine complete rows for clustering
        features = ['gwa', 'income']
        df_complete = filter_complete_students_df(df)
        X = df_complete[features].fillna(0)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        wcss = compute_wcss_for_range(X_scaled, k_min=2, k_max=10)
        recommended_k = recommend_k_by_curvature(wcss)
        # --- Compute clustering quality for recommended_k ---
        try:
            kmeans = KMeans(n_clusters=recommended_k, random_state=42, n_init=10)
            preds = kmeans.fit_predict(X_scaled)

            silhouette = float(silhouette_score(X_scaled, preds))
            dbi = float(davies_bouldin_score(X_scaled, preds))
            chi = float(calinski_harabasz_score(X_scaled, preds))
        except Exception:
            silhouette = dbi = chi = 0

        return {
            "wcss": wcss,
            "recommended_k": recommended_k,
            "quality_metrics": {
                "silhouette": silhouette,
                "davies_bouldin": dbi,
                "calinski_harabasz": chi
            }
        }


    except Exception as e:
        import traceback
        traceback.print_exc()  # <-- prints full error with line numbers
        raise HTTPException(status_code=500, detail=f"Error computing elbow: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# -----------------------------
# Upload Dataset
# -----------------------------
@router.post("/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    k: int | None = None,   # optional k
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can upload datasets")

    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path, dtype={"income": "float64", "gwa": "float64"}, low_memory=False)
        else:
            df = pd.read_excel(file_path)

        df = normalize_and_prepare_df(df)

        # Only use complete students for clustering, but save all students
        features = ['gwa', 'income']
        df_complete = filter_complete_students_df(df)

        if df_complete.empty:
            # No complete rows; still save all rows but create an empty clusters record
            k_final = k or 3
            preds = []
            centroids = []
        else:
            X = df_complete[features].fillna(0)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # auto-select k if not provided
            if k is None:
                wcss = compute_wcss_for_range(X_scaled, k_min=2, k_max=10)
                k = recommend_k_by_curvature(wcss)

            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            preds = kmeans.fit_predict(X_scaled)
            centroids = scaler.inverse_transform(kmeans.cluster_centers_).tolist()
            try:
                silhouette = float(silhouette_score(X_scaled, preds))
                dbi = float(davies_bouldin_score(X_scaled, preds))
                chi = float(calinski_harabasz_score(X_scaled, preds))
            except Exception:
                silhouette = dbi = chi = 0
        # assign predicted cluster only to complete rows; keep others unclustered/unassigned (-1)
        df['Cluster'] = -1
        if not df_complete.empty:
            df.loc[df_complete.index, 'Cluster'] = preds
        df['Cluster'] = df['Cluster'].astype(int)

        connection = get_db_connection()
        if not connection:
            os.remove(file_path)
            raise HTTPException(status_code=500, detail="Database connection failed")
        cursor = connection.cursor()

        # Deactivate all previous datasets
        cursor.execute("UPDATE datasets SET is_active = FALSE")

        # Insert new dataset and mark as active
        cursor.execute(
            "INSERT INTO datasets (filename, uploaded_by, upload_date, is_active) VALUES (%s, %s, %s, TRUE)",
            (file.filename, current_user["id"], datetime.now())
        )

        dataset_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO clusters (dataset_id, k, centroids) VALUES (%s, %s, %s)",
            (dataset_id, k if k is not None else None, json.dumps(centroids) if centroids else json.dumps([]))
        )
        cluster_id = cursor.lastrowid

        for _, row in df.iterrows():
            # Handle text fields (if blank/N/A → "Incomplete")
            def safe_text(val):
                if pd.isna(val) or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
                    return "Incomplete"
                return str(val).strip()

            # Handle numeric fields (if blank/N/A → -1)
            def safe_num(val):
                if pd.isna(val) or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
                    return -1
                try:
                    return float(val)
                except Exception:
                    return -1

            firstname = safe_text(row.get('firstname'))
            lastname = safe_text(row.get('lastname'))
            sex = safe_text(row.get('sex'))
            program = safe_text(row.get('program'))
            municipality = safe_text(row.get('municipality'))
            shs_type = safe_text(row.get('shs_type'))
            shs_origin = safe_text(row.get('shs_origin'))

            income_val = safe_num(row.get('income'))
            gwa_val = safe_num(row.get('gwa'))

            honors = safe_text(row.get('Honors'))
            income_category = safe_text(row.get('IncomeCategory'))

            cursor.execute("""
                INSERT INTO students (firstname, lastname, sex, program, municipality, income, shs_type, shs_origin, gwa, Honors, IncomeCategory, dataset_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                firstname,
                lastname,
                sex,
                program,
                municipality,
                income_val,
                shs_type,
                shs_origin,
                gwa_val,
                honors,
                income_category,
                dataset_id
            ))

            student_id = cursor.lastrowid
            cluster_number = int(row['Cluster']) if 'Cluster' in row and row['Cluster'] is not None else -1
            if cluster_number != -1:
                cursor.execute(
                    "INSERT INTO student_cluster (student_id, cluster_id, cluster_number) VALUES (%s, %s, %s)",
                    (student_id, cluster_id, int(cluster_number))
                )

        connection.commit()
        cursor.close()
        connection.close()
        os.remove(file_path)

        log_activity(current_user["id"], "Upload Dataset", f"Admin uploaded dataset: {file.filename} with {len(df)} records")

        return {
            "message": "Dataset uploaded and processed successfully",
            "dataset_id": dataset_id,
            "total_students": len(df),
            "clusters": k,
            "quality_metrics": {
                "silhouette": silhouette,
                "davies_bouldin": dbi,
                "calinski_harabasz": chi
            }
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {str(e)}")

# -----------------------------
# Get Dataset History
# -----------------------------
@router.get("/datasets")
async def get_datasets(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view dataset history")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("""
        SELECT d.id,
               d.filename,
               d.upload_date,
               u.email AS uploaded_by_email,
               COUNT(DISTINCT s.id) AS student_count,
               MAX(c.k) AS cluster_count,
               d.is_active
        FROM datasets d
        LEFT JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN students s ON d.id = s.dataset_id
        LEFT JOIN clusters c ON d.id = c.dataset_id
        GROUP BY d.id, d.filename, d.upload_date, u.email, d.is_active
        ORDER BY d.upload_date DESC
    """)

    datasets = cursor.fetchall()
    cursor.close()
    connection.close()
    return datasets


# -----------------------------
# Preview Dataset
# -----------------------------
@router.get("/datasets/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can preview datasets")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        "SELECT * FROM students WHERE dataset_id = %s LIMIT 15",
        (dataset_id,)
    )
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return {"rows": rows}


# -----------------------------
# Download Dataset
# -----------------------------
@router.get("/datasets/{dataset_id}/download")
async def download_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can download datasets")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT filename FROM datasets WHERE id = %s", (dataset_id,))
    dataset = cur.fetchone()
    if not dataset:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")

    # fetch all students for this dataset
    cur.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    rows = cur.fetchall()
    cur.close(); conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No students found for this dataset")

    # generate CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    # ✅ Log dataset download
    log_activity(current_user["id"], "Download Dataset", f"Admin downloaded dataset: {dataset['filename']}")

    # return as streaming response
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={dataset['filename'].rsplit('.',1)[0]}_export.csv"
        }
    )
# -----------------------------
# Delete Dataset
# -----------------------------
@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete datasets")

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM student_cluster WHERE student_id IN (SELECT id FROM students WHERE dataset_id = %s)", (dataset_id,))
    cursor.execute("DELETE FROM students WHERE dataset_id = %s", (dataset_id,))
    cursor.execute("DELETE FROM clusters WHERE dataset_id = %s", (dataset_id,))
    cursor.execute("DELETE FROM datasets WHERE id = %s", (dataset_id,))
    cursor.close()
    connection.close()

    # ✅ Log dataset deletion
    log_activity(current_user["id"], "Delete Dataset", f"Admin deleted dataset ID: {dataset_id}")

    return {"message": "Dataset deleted successfully"}


# -----------------------------
# Reactivate Archived Dataset
# -----------------------------
@router.post("/datasets/{dataset_id}/activate")
async def activate_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can activate datasets")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor()

    # Ensure dataset exists
    cursor.execute("SELECT id FROM datasets WHERE id = %s", (dataset_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Set all to archived and activate selected one
    cursor.execute("UPDATE datasets SET is_active = FALSE")
    cursor.execute("UPDATE datasets SET is_active = TRUE WHERE id = %s", (dataset_id,))
    connection.commit()

    cursor.close()
    connection.close()

    # Log activity
    try:
        await log_activity(current_user["id"], "Activate Dataset", f"Admin activated dataset ID: {dataset_id}")
    except Exception:
        pass

    return {"message": f"Dataset {dataset_id} activated successfully"}
