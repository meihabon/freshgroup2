from fastapi import APIRouter, Depends, HTTPException
from db import get_db_connection
from dependencies import get_current_user

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    # Get latest dataset
    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest_dataset = cursor.fetchone()
    if not latest_dataset:
        cursor.close()
        connection.close()
        return {
            "total_students": 0,
            "most_common_program": "N/A",
            "most_common_municipality": "N/A",
            "most_common_sex": "N/A",
            "most_common_income": "N/A",
            "most_common_shs": "N/A",
            "most_common_school": "N/A",
            "most_common_honors": "N/A",
            "sex_distribution": {},
            "program_distribution": {},
            "municipality_distribution": {},
            "income_distribution": {},
            "shs_distribution": {},
            "school_distribution": {},
            "honors_distribution": {},
        }

    dataset_id = latest_dataset["id"]

    # --- Student counts and distributions ---
    cursor.execute("SELECT COUNT(*) as count FROM students WHERE dataset_id = %s", (dataset_id,))
    total_students = cursor.fetchone()["count"]

    cursor.execute("SELECT sex, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY sex", (dataset_id,))
    sex_distribution = {row["sex"]: row["count"] for row in cursor.fetchall()}
    most_common_sex = max(sex_distribution, key=sex_distribution.get) if sex_distribution else "N/A"

    cursor.execute("SELECT program, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY program", (dataset_id,))
    program_distribution = {row["program"]: row["count"] for row in cursor.fetchall()}
    most_common_program = max(program_distribution, key=program_distribution.get) if program_distribution else "N/A"

    cursor.execute("SELECT municipality, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY municipality", (dataset_id,))
    municipality_distribution = {row["municipality"]: row["count"] for row in cursor.fetchall()}
    most_common_municipality = max(municipality_distribution, key=municipality_distribution.get) if municipality_distribution else "N/A"

    cursor.execute("SELECT IncomeCategory, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY IncomeCategory", (dataset_id,))
    income_distribution = {row["IncomeCategory"]: row["count"] for row in cursor.fetchall()}
    most_common_income = max(income_distribution, key=income_distribution.get) if income_distribution else "N/A"

    cursor.execute("SELECT SHS_type, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY SHS_type", (dataset_id,))
    shs_distribution = {row["SHS_type"]: row["count"] for row in cursor.fetchall()}
    most_common_shs = max(shs_distribution, key=shs_distribution.get) if shs_distribution else "N/A"

    # ✅ NEW: SHS_ORIGIN distribution (school origin)
    cursor.execute("SELECT SHS_origin, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY SHS_origin", (dataset_id,))
    school_distribution = {row["SHS_origin"]: row["count"] for row in cursor.fetchall() if row["SHS_origin"]}
    most_common_school = max(school_distribution, key=school_distribution.get) if school_distribution else "N/A"

    cursor.execute("SELECT Honors, COUNT(*) as count FROM students WHERE dataset_id = %s GROUP BY Honors", (dataset_id,))
    honors_distribution = {row["Honors"]: row["count"] for row in cursor.fetchall()}
    most_common_honors = max(honors_distribution, key=honors_distribution.get) if honors_distribution else "N/A"

    cursor.close()
    connection.close()

    # --- Return Dashboard Data ---
    return {
        "total_students": total_students,
        "most_common_program": most_common_program,
        "most_common_municipality": most_common_municipality,
        "most_common_sex": most_common_sex,
        "most_common_income": most_common_income,
        "most_common_shs": most_common_shs,
        "most_common_school": most_common_school,  # ✅ added
        "most_common_honors": most_common_honors,
        "sex_distribution": sex_distribution,
        "program_distribution": program_distribution,
        "municipality_distribution": municipality_distribution,
        "income_distribution": income_distribution,
        "shs_distribution": shs_distribution,
        "school_distribution": school_distribution,  # ✅ added
        "honors_distribution": honors_distribution,
    }
