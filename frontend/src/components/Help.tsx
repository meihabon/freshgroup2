import React, { useRef } from 'react'
import { Container, Accordion, Button } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import {
  BarChart,
  Users,
  Database,
  FileText,
  HelpCircle,
  Layers,
  Download,
} from 'lucide-react'
import jsPDF from 'jspdf'

const Help: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  // 🧾 Generate a text-based PDF (not screenshot)
  const handleDownloadPDF = async () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let y = 20
    const margin = 15
    const lineHeight = 7

    const addTitle = (text: string) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text(text, 105, y, { align: 'center' })
      y += 10
    }

    const addSection = (title: string, content: string[]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.text(title, margin, y)
      y += 7
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      content.forEach((line) => {
        const split = pdf.splitTextToSize(line, 180)
        if (y + split.length * lineHeight > 280) {
          pdf.addPage()
          y = 20
        }
        pdf.text(split, margin, y)
        y += split.length * lineHeight
      })
      y += 5
    }

    // --- Cover Page ---
    addTitle('STUDENT PROFILING & CLUSTERING SYSTEM')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.text('System Help & User Guide', 105, y, { align: 'center' })
    y += 10
    pdf.text(
      `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      105,
      y,
      { align: 'center' }
    )
    pdf.addPage()
    y = 20

    // --- Actual Text Content ---
    addSection('Dashboard Walkthrough', [
      'The Dashboard acts as your command center. It summarizes student performance, demographics, and key trends in one glance.',
      'It includes overview metrics, demographic charts, and interactive filters that update in real time. Each summary card is clickable to show detailed breakdowns.',
      'Tip: Use the Dashboard as your daily starting point for a quick overview of student data.'
    ])

    addSection('Students Walkthrough', [
      'The Students page is a searchable and filterable list of all student profiles.',
      'You can search by name, program, or municipality and apply filters for Program, Sex, Municipality, Income Category, Honors, SHS Type, and SHS Origin (School).',
      'Badges such as "With Honors" or "Low Income" help identify key student groups at a glance.',
      'Admins can edit individual profiles and export filtered data as CSV or Excel files.',
      'Tip: Combine filters to target specific groups, like low-income honors students for scholarship opportunities.'
    ])

    addSection('Clusters Walkthrough', [
      'The Clusters section groups students using K-Means clustering based on their data patterns.',
      'Modes include Official Clusters for reference, Playground Mode for testing, and Pairwise Mode for comparing two attributes (e.g., GWA vs Income).',
      'Each cluster has summaries showing average GWA, income, dominant program, or municipality.',
      'You can also search or filter inside clusters and export data as CSV or PDF.',
      'Tip: Clusters reveal trends among at-risk or high-performing students that aren’t visible in raw data.'
    ])

    addSection('Reports Walkthrough', [
      'The Reports section transforms student data into charts and summaries for reports and presentations.',
      'Available types include Dashboard Summary, Income, Honors, Municipality, SHS Background, and Cluster Analysis.',
      'Reports can be previewed and exported as PDF (for presentations) or CSV (for data reviews).',
      'Some reports include auto-generated recommendations based on analyzed data.',
      'Tip: Use reports as evidence for accreditation, funding, and program evaluations.'
    ])

    if (isAdmin) {
      addSection('Dataset History (Admin Only)', [
        'This section maintains integrity and version control of uploaded datasets.',
        'Admins can review dataset names, uploader, upload date, and record count, and see which clusters or reports were generated from each dataset.',
        'Archived datasets can be restored or reused without re-uploading to ensure consistent comparisons across reports.',
        'Tip: Reusing archived datasets ensures version consistency and saves time.'
      ])

      addSection('User Management (Admin Only)', [
        'Admins manage user accounts, roles, and access privileges in this section.',
        'Admins can add or edit users, reset passwords, assign roles (Admin or Viewer), deactivate inactive accounts, and export user data for audits.',
        'Deactivated users remain in the system but lose login access until reactivated.',
        'Tip: Deactivate users instead of deleting them to preserve history and data accountability.'
      ])
    }

    addSection('Additional Help & Support', [
      'If pages fail to load, refresh the browser or check your internet connection.',
      'If no results show, clear filters or confirm that a dataset is uploaded.',
      'For login or access issues, contact your administrator.',
      'For technical errors, capture a screenshot and report it to IT.',
      'Dataset uploads must follow the official CSV format.'
    ])

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(10)
    pdf.text('End of User Manual — ISPSC SPCS © 2025', 105, 285, { align: 'center' })

    // ✅ Save the PDF
    pdf.save('SPCS_User_Manual.pdf')
  }


  return (
    <Container className="my-5">
      {/* PAGE TITLE */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">System Help & User Guide</h2>
        <Button variant="outline-danger" onClick={handleDownloadPDF}>
          <Download size={16} className="me-1" />
          Download PDF Manual
        </Button>
      </div>

      {/* INTRODUCTION */}
      <p className="text-muted">
        Welcome to the <b>Student Profiling & Clustering System</b>. This platform helps ISPSC efficiently
        manage student data, create meaningful clusters, and generate actionable insights.
      </p>
      <p className="text-muted">
        This guide walks you through each module, providing practical instructions and tips. You can also
        download it as a <b>PDF manual</b> using the button above.
      </p>

      {/* ACCORDION START */}
      <Accordion defaultActiveKey="0" alwaysOpen>

        {/* DASHBOARD */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <BarChart size={18} className="me-2 text-primary" />
            Dashboard Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Dashboard</b> acts as your <i>command center</i>, summarizing student performance,
              demographics, and overall trends at a glance.
            </p>
            <ol>
              <li><b>Overview Metrics:</b> Quick stats show totals and averages like GWA, sex ratio, and program distribution.</li>
              <li><b>Demographic Charts:</b> Interactive visualizations by program, municipality, income category, and SHS background.</li>
              <li><b>Most Common Values:</b> Instantly spot dominant programs or most represented municipalities.</li>
              <li><b>Filters:</b> Adjust filters live; charts and counts update instantly.</li>
              <li><b>Clickable Cards:</b> Click summary boxes to drill deeper into details.</li>
            </ol>
            <p className="text-muted"><b>Tip:</b> Use the Dashboard as your daily starting point for insights.</p>
          </Accordion.Body>
        </Accordion.Item>

        {/* STUDENTS */}
        <Accordion.Item eventKey="1">
          <Accordion.Header>
            <Users size={18} className="me-2 text-success" />
            Students Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Students</b> page is a searchable, filterable list of all student records. You can browse, edit, and export profiles.
            </p>
            <ol>
              <li><b>Search Bar:</b> Instantly search by name, program, or municipality.</li>
              <li><b>Filters:</b> Filter by <b>Program</b>, <b>Sex</b>, <b>Municipality</b>, <b>Income Category</b>, <b>Honors</b>, <b>SHS Type</b>, and now also by <b>SHS Origin (School)</b>.</li>
              <li><b>Badges:</b> Quick visual indicators like “With Honors” or “Low-Income”.</li>
              <li><b>Profile View:</b> Click a row to view complete details.</li>
              <li><b>Editing:</b> Admins can update individual student records through the Edit button.</li>
              <li><b>Export:</b> Download filtered results as CSV or Excel for analysis or reporting.</li>
            </ol>
            <p className="text-muted"><b>Tip:</b> Combine filters to find specific student groups for targeted support or scholarships.</p>
          </Accordion.Body>
        </Accordion.Item>

        {/* CLUSTERS */}
        <Accordion.Item eventKey="2">
          <Accordion.Header>
            <Layers size={18} className="me-2 text-warning" />
            Clusters Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Clusters</b> section uses <b>k-means clustering</b> to automatically group students by patterns in their data.
            </p>
            <ol>
              <li><b>Official Clusters:</b> Managed by Admins for official reference and reporting.</li>
              <li><b>Playground Mode:</b> Try custom numbers of clusters (<b>k</b>) to explore alternative groupings.</li>
              <li><b>Pairwise Mode:</b> Compare any two attributes (e.g., GWA vs Income or Program vs Municipality).</li>
              <li><b>Scatter Plots:</b> Interactive visuals show each student as a colored point, with centroids marked as C0, C1, etc.</li>
              <li><b>Cluster Summaries:</b> Expand each cluster to see average GWA, income, and dominant traits.</li>
              <li><b>Search & Filters:</b> Inside each cluster, you can search or filter students just like in the Students page.</li>
              <li><b>Exports:</b> Download detailed cluster reports as PDF or CSV.</li>
            </ol>
            <p className="text-muted"><b>Tip:</b> Use clustering insights to identify at-risk or high-performing student groups.</p>
          </Accordion.Body>
        </Accordion.Item>

        {/* REPORTS */}
        <Accordion.Item eventKey="3">
          <Accordion.Header>
            <FileText size={18} className="me-2 text-info" />
            Reports Walkthrough
          </Accordion.Header>
          <Accordion.Body>
            <p>
              The <b>Reports</b> section turns your data into ready-to-share visual summaries for decision-making.
            </p>
            <ol>
              <li><b>Report Types:</b> Includes Dashboard Summary, Income, Honors, Municipality, SHS Background, and Cluster Analysis.</li>
              <li><b>Preview:</b> View charts and tables before downloading.</li>
              <li><b>Export Options:</b> Download as PDF (for presentations) or CSV (for data review).</li>
              <li><b>Recommendations:</b> Auto-generated insights guide administrative decisions.</li>
            </ol>
            <p className="text-muted"><b>Tip:</b> Reports are ideal for accreditation, board meetings, or funding proposals.</p>
          </Accordion.Body>
        </Accordion.Item>

        {/* DATASET HISTORY */}
        {isAdmin && (
          <Accordion.Item eventKey="4">
            <Accordion.Header>
              <Database size={18} className="me-2 text-danger" />
              Dataset History (Admin Only)
            </Accordion.Header>
            <Accordion.Body>
              <p>
                The <b>Dataset History</b> section maintains data integrity and version control for uploaded student files.
              </p>
              <ol>
                <li><b>View Details:</b> Review dataset name, uploader, upload date, and record count.</li>
                <li><b>Track Outputs:</b> See which clusters or reports were generated from each dataset.</li>
                <li><b>Reuse Archived Datasets:</b> Admins can <b>restore or reuse</b> archived datasets when needed instead of re-uploading new ones.</li>
                <li><b>Replace or Delete:</b> Update outdated datasets or remove invalid uploads to maintain clean data.</li>
              </ol>
              <p className="text-muted"><b>Tip:</b> Reusing archived datasets saves time and ensures consistent data comparisons across reports.</p>
            </Accordion.Body>
          </Accordion.Item>
        )}

        {/* USER MANAGEMENT */}
        {isAdmin && (
          <Accordion.Item eventKey="6">
            <Accordion.Header>
              <Users size={18} className="me-2 text-primary" />
              User Management (Admin Only)
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <b>User Management</b> allows Admins to manage system access, roles, and account activity.
              </p>
              <ol>
                <li><b>Add / Edit Users:</b> Create or modify user accounts (name, department, role).</li>
                <li><b>Reset Passwords:</b> Reset user passwords securely using the strength meter.</li>
                <li><b>Roles & Permissions:</b> Assign <b>Admin</b> or <b>Viewer</b> roles to control system access.</li>
                <li><b>Deactivate Accounts:</b> Admins can <b>deactivate</b> users who are inactive or no longer part of the institution without deleting their records.</li>
                <li><b>Export & Audit:</b> Export user lists to CSV, PDF, or Excel for audit purposes.</li>
                <li><b>Delete Users:</b> Permanently remove accounts when necessary for security compliance.</li>
              </ol>
              <p className="text-muted"><b>Tip:</b> Use deactivation instead of deletion for temporary account suspension.</p>
            </Accordion.Body>
          </Accordion.Item>
        )}

        {/* HELP & SUPPORT */}
        <Accordion.Item eventKey="5">
          <Accordion.Header>
            <HelpCircle size={18} className="me-2 text-secondary" />
            Additional Help & Support
          </Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><b>Page not loading:</b> Refresh your browser or check your internet connection.</li>
              <li><b>No results showing:</b> Clear filters or ensure a dataset is uploaded.</li>
              <li><b>Login issues:</b> Contact your system administrator.</li>
              <li><b>Charts not visible:</b> Use Chrome/Edge with JavaScript enabled.</li>
              <li><b>Errors:</b> Take a screenshot and report to IT for assistance.</li>
              <li><b>Dataset upload issues:</b> Confirm your CSV follows the official format template.</li>
            </ul>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  )
}

export default Help