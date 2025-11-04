from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_income, classify_honors
from utils_complete import is_record_complete_row, filter_complete_students_df
import routes.clusters as clusters_module
from .users import log_activity, resolve_user

router = APIRouter()

@router.get("/students")
async def get_students(
    program: Optional[str] = None,
    sex: Optional[str] = None,
    municipality: Optional[str] = None,
    income_category: Optional[str] = None,
    shs_type: Optional[str] = None,
    shs_origin: Optional[str] = None,
    honors: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest_dataset = cursor.fetchone()
    if not latest_dataset:
        cursor.close()
        connection.close()
        return []

    dataset_id = latest_dataset["id"]

    query = "SELECT * FROM students WHERE dataset_id = %s"
    params = [dataset_id]

    if program:
        query += " AND program = %s"
        params.append(program)
    if sex:
        query += " AND sex = %s"
        params.append(sex)
    if municipality:
        query += " AND municipality = %s"
        params.append(municipality)
    if income_category:
        query += " AND IncomeCategory = %s"
        params.append(income_category)
    if shs_type:
        query += " AND SHS_type = %s"
        params.append(shs_type)
    if shs_origin:
        query += " AND SHS_origin = %s"
        params.append(shs_origin)
    if honors:
        query += " AND Honors = %s"
        params.append(honors)
    if search:
        # ✅ search both firstname and lastname
        query += " AND (firstname LIKE %s OR lastname LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    cursor.execute(query, params)
    students = cursor.fetchall()
    cursor.close()
    connection.close()
    return students

@router.put("/students/{student_id}")
async def update_student(
    student_id: int,
    student_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    # Fetch existing student
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    if not student:
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="Student not found")

    # Extract editable fields
    firstname = student_data.get("firstname", student["firstname"])
    lastname = student_data.get("lastname", student["lastname"])
    sex = student_data.get("sex", student["sex"])
    program = student_data.get("program", student["program"])
    municipality = student_data.get("municipality", student["municipality"])
    shs_type = student_data.get("SHS_type", student["SHS_type"])
    shs_origin = student_data.get("SHS_origin", student["SHS_origin"])
    gwa = student_data.get("GWA", student["GWA"])
    income = student_data.get("income", student["income"])

    # 🔒 Honors & IncomeCategory should be system-computed
    honors = classify_honors({"gwa": gwa})
    income_category = classify_income(income)

    # ✅ define the update_query here
    update_query = """
        UPDATE students
        SET firstname=%s, lastname=%s, sex=%s, program=%s,
            municipality=%s, SHS_type=%s, SHS_origin=%s, GWA=%s, income=%s,
            Honors=%s, IncomeCategory=%s
        WHERE id=%s
    """

    try:
        cursor.execute(update_query, (
            firstname, lastname, sex, program,
            municipality, shs_type, shs_origin, gwa, income,
            honors, income_category, student_id
        ))
        connection.commit()
        # ✅ Log the edit action (for both Admin and Viewer)
        full_name = f"{firstname} {lastname}".strip()
        log_activity(
            current_user["id"],
            "Edit Student Record",
            f"{current_user['email']} edited record of {full_name} (ID: {student_id}). Reclustering triggered."
        )

    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
    finally:
        cursor.close()
        connection.close()

    # After update, check if the student became complete; if so, trigger recluster
    # Fetch the freshly updated student row
    conn2 = get_db_connection()
    if conn2:
        cur2 = conn2.cursor(dictionary=True)
        cur2.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        updated = cur2.fetchone()
        cur2.close(); conn2.close()

        # Check completeness
        became_complete = False
        try:
            was_complete_before = is_record_complete_row(student)
            is_complete_now = is_record_complete_row(updated)
            if (not was_complete_before) and is_complete_now:
                became_complete = True
        except Exception:
            became_complete = False

        if became_complete:
            # Trigger recluster with k from latest clusters (if exists) or default k=3
            try:
                # find last k
                conn3 = get_db_connection()
                if conn3:
                    cur3 = conn3.cursor(dictionary=True)
                    cur3.execute("SELECT k FROM clusters WHERE dataset_id = (SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1) ORDER BY id DESC LIMIT 1")
                    row = cur3.fetchone()
                    cur3.close(); conn3.close()
                    k_to_use = int(row["k"]) if row and row.get("k") else 3
                else:
                    k_to_use = 3

                # Call recluster route function directly (it handles role checks and saving)
                import asyncio
                asyncio.create_task(clusters_module.recluster(k=k_to_use, current_user=current_user))
            except Exception as e:
                # don't fail the update if recluster trigger failed; log instead
                print("Recluster trigger failed:", e)

    return {"message": "Student updated successfully. Reclustering triggered."}