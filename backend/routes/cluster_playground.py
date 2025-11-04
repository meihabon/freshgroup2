from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io, csv
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
import matplotlib.pyplot as plt
from dependencies import get_current_user
from db import get_db_connection
from utils_complete import filter_complete_students_df
import routes.clusters as clusters_module

router = APIRouter()

# Fetch all students from latest dataset
def fetch_students():
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest = cursor.fetchone()
    if not latest:
        return []

    cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (latest["id"],))
    students = cursor.fetchall()
    cursor.close()
    connection.close()
    return students


# Playground clustering endpoint
@router.get("/clusters/playground")
async def cluster_playground(
    k: int = Query(..., ge=2, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Runs clustering on the latest dataset with user-specified k (Playground mode).
    Returns students + centroids so frontend can display them.
    Available to both Admins and Viewers.
    """
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    # Get latest dataset
    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    dataset = cursor.fetchone()
    if not dataset:
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="No dataset found")
    dataset_id = dataset["id"]

    # Get students for this dataset
    cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    students = cursor.fetchall()
    cursor.close()
    connection.close()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for latest dataset")

    if k > len(students):
        raise HTTPException(status_code=400, detail="k cannot be greater than the number of students")

    # Use the same normalization/encoding and completeness filter as pairwise
    df = pd.DataFrame(students)
    # normalize canonical columns and safely encode categoricals
    df = clusters_module.normalize_dataframe_columns(df)
    df = clusters_module.encode_categorical_safe(df, ["sex", "program", "municipality", "shs_type","shs_origin"])

    # filter complete rows using the shared helper
    df_complete = filter_complete_students_df(df)
    if df_complete.empty:
        raise HTTPException(status_code=400, detail="No complete students available for clustering")

    # For playground we cluster on canonical gwa/income (use encoders when present via actual_col)
    def actual_col(canon: str) -> str:
        if canon in {"sex", "program", "municipality", "shs_type"}:
            return f"{canon}_enc" if f"{canon}_enc" in df_complete.columns else canon
        return canon

    x_col = actual_col("gwa")
    y_col = actual_col("income")

    X = df_complete[[x_col, y_col]].fillna(0).astype(float)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    preds = kmeans.fit_predict(X_scaled)

    centroids = scaler.inverse_transform(kmeans.cluster_centers_).tolist()

    # attach cluster only to complete rows
    df_complete = df_complete.copy()
    df_complete["Cluster"] = preds

    # Build student output similar to pairwise so frontend receives the same shape
    students_out = []
    for _, row in df_complete.iterrows():
        students_out.append({
            "id": int(row.get("id", 0)),
            "firstname": row.get("firstname"),
            "lastname": row.get("lastname"),
            "sex": row.get("sex"),
            "program": row.get("program"),
            "municipality": row.get("municipality"),
            "income": float(row.get("income") or 0),
            "SHS_type": row.get("shs_type"),
            "SHS_origin": row.get("shs_origin"),
            "GWA": float(row.get("gwa") or 0),
            "Honors": row.get("Honors"),
            "IncomeCategory": row.get("IncomeCategory"),
            "Cluster": int(row["Cluster"]),
            "pair_x": float(row[x_col]),
            "pair_y": float(row[y_col]),
            "pair_x_label": str(row.get("gwa")) if "gwa" in row.index else str(row.get(x_col)),
            "pair_y_label": str(row.get("income")) if "income" in row.index else str(row.get(y_col)),
        })

    return {
        "students": students_out,
        "centroids": centroids
    }


# Export playground clustering results
@router.get("/reports/cluster_playground")
async def export_cluster_playground(
    k: int = Query(3, ge=2, le=10),
    format: str = Query("pdf"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export playground clustering results (PDF or CSV).
    Available to both Admins and Viewers.
    """
    if current_user["role"] not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    students = fetch_students()
    if not students:
        raise HTTPException(status_code=404, detail="No dataset found")

    df = pd.DataFrame(students)
    # normalize canonical columns so we reliably use 'gwa' and 'income'
    df = clusters_module.normalize_dataframe_columns(df)
    df = clusters_module.encode_categorical_safe(df, ["sex", "program", "municipality", "shs_type", "shs_origin"])

    df_complete = filter_complete_students_df(df)
    if df_complete.empty:
        raise HTTPException(status_code=404, detail="No complete students available for export")

    features = ["gwa", "income"]
    X = df_complete[features].fillna(0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    df_complete["Cluster"] = kmeans.fit_predict(X_scaled)

    cluster_counts = df_complete["Cluster"].value_counts().to_dict()

    # === CSV Export ===
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Cluster", "Count"])
        for c, v in cluster_counts.items():
            writer.writerow([f"Cluster {c}", v])
        writer.writerow([])
        writer.writerow(["Firstname", "Lastname", "GWA", "Income", "Cluster"])
        for _, row in df_complete.iterrows():
            writer.writerow([row.get("firstname"), row.get("lastname"), row.get("gwa"), row.get("income"), row.get("Cluster")])
        return StreamingResponse(
            io.BytesIO(buffer.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cluster_playground.csv"}
        )

    # === PDF Export ===
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()
    story = [Paragraph(f"Playground Cluster Report (k={k})", styles["Title"]), Spacer(1, 20)]

    story.append(Paragraph("<b>Cluster Summary:</b>", styles["Heading2"]))
    for c, v in cluster_counts.items():
        story.append(Paragraph(f"Cluster {c}: <b>{v}</b>", styles["Normal"]))
    story.append(Spacer(1, 20))

    # Chart
    fig, ax = plt.subplots()
    ax.bar(cluster_counts.keys(), cluster_counts.values())
    ax.set_title("Cluster Distribution")
    img_buf = io.BytesIO()
    fig.savefig(img_buf, format="png", bbox_inches="tight")
    plt.close(fig)
    img_buf.seek(0)
    story.append(Image(img_buf, width=5*inch, height=3*inch))
    story.append(Spacer(1, 20))

    # Students table
    table_data = [["Firstname", "Lastname", "Program", "Municipality", "Income", "Income Category", "SHS Type", "SHS_origin", "GWA", "Honors", "Cluster"]] + \
        df_complete[["firstname", "lastname", "program", "municipality", "income", "IncomeCategory", "SHS_type", "shs_origin" "gwa", "Honors", "Cluster"]].values.tolist()
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cluster_playground.pdf"}
    )
