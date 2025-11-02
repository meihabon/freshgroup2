import { useState, useEffect } from 'react'
import { 
  Row, Col, Card, Table, Form, Button, 
  InputGroup, Badge, Modal, Accordion 
} from 'react-bootstrap'
import { Search, Filter, Download } from 'lucide-react'
import RecordViewModal from './RecordViewModal'
import { useAuth } from "../context/AuthContext"
import { updateStudent } from "../api"
 
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

interface Student {
  id: number
  firstname: string
  lastname: string
  sex: 'Male' | 'Female' | 'Incomplete' | null
  program: string
  municipality: string
  income: number
  SHS_type: string
  GWA: number
  Honors: string
  IncomeCategory: string
  areaType?: string 
}

function Students() {
  const { API } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  // removed loading/error UI; errors will be logged to console

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [sexFilter, setSexFilter] = useState('')
  const [municipalityFilter, setMunicipalityFilter] = useState('')
  const [incomeFilter, setIncomeFilter] = useState('')
  const [shsFilter, setShsFilter] = useState('')
  const [honorsFilter, setHonorsFilter] = useState('')
  const [areaTypeFilter, setAreaTypeFilter] = useState("");


  // Dropdown options
  const [programs, setPrograms] = useState<string[]>([])
  const [municipalities, setMunicipalities] = useState<string[]>([])
  const [shsTypes, setShsTypes] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [studentsPerPage, setStudentsPerPage] = useState<number>(10)

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [students, searchTerm, programFilter, sexFilter, municipalityFilter, incomeFilter, shsFilter, honorsFilter, areaTypeFilter])

  const fetchStudents = async () => {
    try {
      const response = await API.get('/students')
      setStudents(response.data)

      const uniquePrograms = [...new Set(response.data.map((s: Student) => s.program))].sort()
      const uniqueMunicipalities = [...new Set(response.data.map((s: Student) => s.municipality))].sort()
      const uniqueShsTypes = [...new Set(response.data.map((s: Student) => s.SHS_type))].sort()

    setPrograms(uniquePrograms as string[])
    setMunicipalities(uniqueMunicipalities as string[])
    setShsTypes(uniqueShsTypes as string[])

    } catch (error: any) {
      // log error for debugging; avoid throwing UI-blocking state
      console.error(error.response?.data?.detail || error.message || 'Failed to fetch students')
    }
  }

  const applyFilters = () => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(student =>
        `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (programFilter) filtered = filtered.filter(s => s.program === programFilter)
    if (sexFilter) filtered = filtered.filter(s => s.sex === sexFilter)
    if (municipalityFilter) filtered = filtered.filter(s => s.municipality === municipalityFilter)
    if (incomeFilter) filtered = filtered.filter(s => s.IncomeCategory === incomeFilter)
    if (shsFilter) filtered = filtered.filter(s => s.SHS_type === shsFilter)
    if (honorsFilter) filtered = filtered.filter(s => s.Honors === honorsFilter)
    if (areaTypeFilter) {
      filtered = filtered.filter((s) => getAreaType(s.municipality) === areaTypeFilter);
    }

    setFilteredStudents(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setProgramFilter('')
    setSexFilter('')
    setMunicipalityFilter('')
    setIncomeFilter('')
    setShsFilter('')
    setHonorsFilter('')
  }

// ✅ Export filtered students as CSV or Excel
const exportToCSV = () => {
  const headers = [
    'firstname',
    'lastname',
    'sex',
    'program',
    'municipality',
    'area_type',
    'income',
    'SHS_type',
    'GWA',
    'Honors',
    'IncomeCategory',
  ];

  const csvContent = [
    headers.join(','),
    ...filteredStudents.map(student =>
      [
        student.firstname,
        student.lastname,
        student.sex,
        student.program,
        student.municipality,
        getAreaType(student.municipality),
        student.income,
        student.SHS_type,
        student.GWA,
        student.Honors,
        student.IncomeCategory,
      ].join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
};

// ✅ New function: export to Excel (.xlsx)
const exportToExcel = () => {
  if (filteredStudents.length === 0) {
    alert("No data to export");
    return;
  }

  // Convert filtered students to sheet-friendly objects
  const worksheetData = filteredStudents.map((student) => ({
    Firstname: student.firstname,
    Lastname: student.lastname,
    Sex: student.sex,
    Program: student.program,
    Municipality: student.municipality,
    "Area Type": getAreaType(student.municipality),
    Income: student.income,
    "SHS Type": student.SHS_type,
    GWA: student.GWA,
    Honors: student.Honors,
    "Income Category": student.IncomeCategory,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "students.xlsx");
};


  const getHonorsBadgeVariant = (honors: string) => {
    switch (honors) {
      case 'With Highest Honors': return 'success'
      case 'With High Honors': return 'warning'
      case 'With Honors': return 'info'
      default: return 'secondary'
    }
  }

  const getAreaType = (municipality: string) => {
    if (!municipality || municipality.trim() === "") return "No Municipality Entered";

    const uplandMunicipalities = [
    // 📍 Ilocos Sur (14 official upland)
    "Alilem", "Banayoyo", "Burgos", "Cervantes", "Galimuyod",
    "Gregorio del Pilar", "Lidlidda", "Nagbukel", "Quirino",
    "Salcedo", "San Emilio", "Sigay", "Sugpon", "Suyo",

    // 📍 La Union (mountainous upland)
    "Bagulin", "Burgos", "Naguilian", "San Gabriel", "Santol", "Sudipen", "Tubao"
    ];

    // Normalize municipality name
    const normalized = municipality
      .replace(/^sta\.?\s*/i, "santa ")
      .replace(/^sto\.?\s*/i, "santo ")
      .trim()
      .toLowerCase();

    const isUpland = uplandMunicipalities.some(
      (m) => m.toLowerCase() === normalized
    );

    return isUpland ? "Upland" : "Lowland";
  };


  const getIncomeBadgeVariant = (income: string) => {
    switch (income) {
      case 'Poor':
      case 'Low-Income': return 'danger'
      case 'Lower-Middle': return 'warning'
      case 'Middle-Middle': return 'secondary'
      case 'Upper-Middle': return 'info'
      case 'Upper-Income': return 'primary'
      case 'Rich': return 'success'
      default: return 'dark'
    }
  }

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null)
  const handleEditClick = (student: Student) => {
    setSelectedStudent(student)
    setShowEditModal(true)
  }

  const handleRowClick = (student: Student) => {
    setViewedStudent(student)
    setShowViewModal(true)
  }

  const handleSave = async () => {
    if (!selectedStudent) return

    const payload = {
      firstname: selectedStudent.firstname,
      lastname: selectedStudent.lastname,
      sex: selectedStudent.sex,
      program: selectedStudent.program,
      municipality: selectedStudent.municipality,
      SHS_type: selectedStudent.SHS_type,
      GWA: selectedStudent.GWA,
      income: selectedStudent.income,
    }

    try {
      const res = await updateStudent(selectedStudent.id, payload)
      alert(res.data?.message || 'Student updated successfully')
      setShowEditModal(false)
      fetchStudents()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update student')
    }
  }

  // Pagination logic
  const indexOfLast = currentPage * studentsPerPage
  const indexOfFirst = indexOfLast - studentsPerPage
  const currentStudents = filteredStudents.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)

  return (
    <div className="fade-in">
      <div className="students-layout mb-4 d-flex align-items-start" style={{ gap: 16 }}>
        <div className="main-column" style={{ flex: 1, minWidth: 0 }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
            <div>
              <h2 className="fw-bold mb-0">Students</h2>
            </div>

            <div>
              {/* Controls moved to the compact filter card above the table */}
            </div>
          </div>

          {/* Compact filter bar placed above the table */}
          <Card className="mb-3">
            <Card.Body>
              <Row className="align-items-center gy-2">
                <Col xs={12} md={6} lg={5}>
                  <InputGroup size="sm">
                    <InputGroup.Text>
                      <Search size={14} />
                    </InputGroup.Text>
                    <Form.Control
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, municipality, or program..."
                    />
                  </InputGroup>
                </Col>

                <Col xs={6} md={3} lg={2}>
                <Form.Label className="small fw-semibold">Show:</Form.Label>
                  <Form.Select size="sm" value={studentsPerPage} onChange={(e) => { setStudentsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={30}>30 rows</option>
                  </Form.Select>
                </Col>

                <Col xs={6} md={3} lg={5} className="d-flex justify-content-end" style={{ gap: 8 }}>
                  <Button variant="outline-secondary" size="sm" onClick={clearFilters}><Filter size={14} className="me-1" /> Reset</Button>
                  <Button variant="outline-success" size="sm" onClick={exportToCSV}>
                    <Download size={14} className="me-1" /> Export CSV
                  </Button>

                  <Button variant="outline-primary" size="sm" onClick={exportToExcel}>
                    <Download size={14} className="me-1" /> Export Excel
                  </Button>

                </Col>

                <Col xs={12}>
                  <Accordion>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>More filters</Accordion.Header>
                      <Accordion.Body>
                        <Row className="g-2">
                          <Col xs={12} md={4} lg={3}>
                            <Form.Label className="small fw-semibold">Program</Form.Label>
                            <Form.Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} size="sm">
                              <option value="">All Programs</option>
                              {programs.map(program => (
                                <option key={program} value={program}>{program}</option>
                              ))}
                            </Form.Select>
                          </Col>

                          <Col xs={6} md={4} lg={3}>
                            <Form.Label className="small fw-semibold">Sex</Form.Label>
                            <Form.Select value={sexFilter} onChange={(e) => setSexFilter(e.target.value)} size="sm">
                              <option value="">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </Form.Select>
                          </Col>

                          <Col xs={6} md={4} lg={3}>
                            <Form.Label className="small fw-semibold">Area Type</Form.Label>
                            <Form.Select value={areaTypeFilter} onChange={(e) => setAreaTypeFilter(e.target.value)} size="sm">
                              <option value="">All Areas</option>
                              <option value="Upland">Upland</option>
                              <option value="Lowland">Lowland</option>
                            </Form.Select>
                          </Col>

                          <Col xs={12} md={6} lg={3}>
                            <Form.Label className="small fw-semibold">Municipality</Form.Label>
                            <Form.Select value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)} size="sm">
                              <option value="">All Municipalities</option>
                              {municipalities.map(municipality => (
                                <option key={municipality} value={municipality}>{municipality}</option>
                              ))}
                            </Form.Select>
                          </Col>

                          <Col xs={12} md={6} lg={3}>
                            <Form.Label className="small fw-semibold">Income Category</Form.Label>
                            <Form.Select value={incomeFilter} onChange={(e) => setIncomeFilter(e.target.value)} size="sm">
                              <option value="">All Income Levels</option>
                              <option value="Poor">Poor</option>
                              <option value="Low-Income">Low-Income</option>
                              <option value="Lower-Middle">Lower-Middle</option>
                              <option value="Middle-Middle">Middle-Middle</option>
                              <option value="Upper-Middle">Upper-Middle</option>
                              <option value="Upper-Income">Upper-Income</option>
                              <option value="Rich">Rich</option>

                            </Form.Select>
                          </Col>

                          <Col xs={12} md={6} lg={3}>
                            <Form.Label className="small fw-semibold">SHS Type</Form.Label>
                            <Form.Select value={shsFilter} onChange={(e) => setShsFilter(e.target.value)} size="sm">
                              <option value="">All SHS Types</option>
                              {shsTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </Form.Select>
                          </Col>

                          <Col xs={12} md={6} lg={3}>
                            <Form.Label className="small fw-semibold">Honors</Form.Label>
                            <Form.Select value={honorsFilter} onChange={(e) => setHonorsFilter(e.target.value)} size="sm">
                              <option value="">All Honors</option>
                              <option value="Average">Average</option>
                              <option value="With Honors">With Honors</option>
                              <option value="With High Honors">With High Honors</option>
                              <option value="With Highest Honors">With Highest Honors</option>

                            </Form.Select>
                          </Col>
                        </Row>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="p-0">
              <div className="d-flex justify-content-end align-items-center p-2">
                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                  <Form.Label className="small mb-0 me-1">Show:</Form.Label>
                  <Form.Select size="sm" value={studentsPerPage} onChange={(e) => { setStudentsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ width: 110 }}>
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={30}>30 rows</option>
                  </Form.Select>
                </div>
              </div>
              <div className="table-responsive-sm students-table-wrapper">
                <Table striped hover responsive className="mb-0 students-table table-sm responsive-card-table" style={{ tableLayout: 'fixed', width: '100%', fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th className="col-first" style={{ width: '8%' }}>First Name</th>
                      <th className="col-last" style={{ width: '8%' }}>Last Name</th>
                      <th className="col-sex" style={{ width: '4%' }}>Sex</th>
                      <th className="col-program" style={{ width: '16%' }}>Program</th>
                      <th className="col-muni" style={{ width: '12%' }}>Municipality</th>
                      <th className="col-area" style={{ width: '6%' }}>Area Type</th>
                      <th className="col-income" style={{ width: '8%' }}>Income</th>
                      <th className="col-shs" style={{ width: '8%' }}>Senior High School Type</th>
                      <th className="col-gwa" style={{ width: '5%' }}>HS GWA</th>
                      <th className="d-none d-md-table-cell col-honors" style={{ width: '8%' }}>Honors</th>
                      <th className="d-none d-md-table-cell col-income-cat" style={{ width: '8%' }}>Income Category</th>
                      <th className="col-actions" style={{ width: '7%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudents.map((student) => (
                      <tr key={student.id} onClick={() => handleRowClick(student)} style={{ cursor: 'pointer' }}>
                        <td data-label="First Name" className="fw-semibold text-truncate" style={{ maxWidth: 110 }}>{student.firstname && student.firstname !== 'Incomplete' ? student.firstname : <Badge bg="danger">No First Name</Badge>}</td>
                        <td data-label="Last Name" className="fw-semibold text-truncate" style={{ maxWidth: 110 }}>{student.lastname && student.lastname !== 'Incomplete' ? student.lastname : <Badge bg="danger">No Last Name</Badge>}</td>
                        <td data-label="Sex" className="text-truncate" style={{ maxWidth: 60 }}>{student.sex && student.sex !== 'Incomplete' ? student.sex : <Badge bg="danger">No Sex</Badge>}</td>
                        <td data-label="Program" className="text-truncate" style={{ maxWidth: 220 }}>{student.program && student.program !== 'Incomplete' ? student.program : <Badge bg="danger">No Program</Badge>}</td>
                        <td data-label="Municipality" className="text-truncate" style={{ maxWidth: 160 }}>{student.municipality && student.municipality !== 'Incomplete' ? student.municipality : <Badge bg="danger">No Municipality</Badge>}</td>
                        <td data-label="Area Type">
                          <Badge bg={getAreaType(student.municipality) === 'Upland' ? 'success' : getAreaType(student.municipality) === 'Lowland' ? 'info' : 'secondary'}>
                            {getAreaType(student.municipality)}
                          </Badge>
                        </td>
                        <td data-label="Income" className="text-truncate" style={{ maxWidth: 120 }}>{student.income === -1 || student.income === null ? <Badge bg="danger">No Income Entered</Badge> : `₱${student.income.toLocaleString()}`}</td>
                        <td data-label="SHS Type" className="text-truncate" style={{ maxWidth: 130 }}>{student.SHS_type && student.SHS_type !== 'Incomplete' ? student.SHS_type : <Badge bg="danger">No SHS Type</Badge>}</td>
                        <td data-label="GWA" className="text-truncate" style={{ maxWidth: 80 }}>{student.GWA === -1 || student.GWA === null ? <Badge bg="danger">No GWA Entered</Badge> : student.GWA}</td>
                        <td data-label="Honors" className="d-none d-md-table-cell text-truncate" style={{ maxWidth: 140 }}><Badge bg={getHonorsBadgeVariant(student.Honors)}>{student.Honors && student.Honors !== 'Incomplete' ? student.Honors : 'No Honors'}</Badge></td>
                        <td data-label="Income Category" className="d-none d-md-table-cell text-truncate" style={{ maxWidth: 140 }}><Badge bg={getIncomeBadgeVariant(student.IncomeCategory)}>{student.IncomeCategory && student.IncomeCategory !== 'Incomplete' ? student.IncomeCategory : 'No Income Category'}</Badge></td>
                        <td data-label="Actions" style={{ maxWidth: 90 }}><Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(student); }}>Edit</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Pagination Controls */}
                <div className="d-flex flex-column align-items-center mt-3">
                  <div className="mb-2 text-muted">
                    Showing {Math.min(indexOfFirst + 1, filteredStudents.length)} - {Math.min(indexOfLast, filteredStudents.length)} of {filteredStudents.length} students
                    {filteredStudents.length > studentsPerPage && ` (Page ${currentPage} of ${totalPages})`}
                  </div>

                  {totalPages > 1 && (() => {
                    const pageChunkSize = 10
                    const currentChunk = Math.floor((currentPage - 1) / pageChunkSize)
                    const startPage = currentChunk * pageChunkSize + 1
                    const endPage = Math.min(startPage + pageChunkSize - 1, totalPages)

                    return (
                      <div className="d-flex gap-2 flex-wrap justify-content-center align-items-center">
                        <Button size="sm" variant="outline-success" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Prev</Button>
                        {startPage > 1 && (<Button size="sm" variant="outline-success" onClick={() => setCurrentPage(startPage - 1)}>&hellip;</Button>)}
                        {[...Array(endPage - startPage + 1)].map((_, i) => { const page = startPage + i; return (<Button key={page} size="sm" variant={currentPage === page ? 'success' : 'outline-success'} onClick={() => setCurrentPage(page)}>{page}</Button>); })}
                        {endPage < totalPages && (<Button size="sm" variant="outline-success" onClick={() => setCurrentPage(endPage + 1)}>Next</Button>)}
                        <Button size="sm" variant="outline-success" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next Page</Button>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Edit Modal */}
          <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Edit Student</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedStudent && (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control type="text" value={selectedStudent.firstname} onChange={(e) => setSelectedStudent({ ...selectedStudent, firstname: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control type="text" value={selectedStudent.lastname} onChange={(e) => setSelectedStudent({ ...selectedStudent, lastname: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Sex</Form.Label>
                    <Form.Select value={selectedStudent.sex || ''} onChange={(e) => setSelectedStudent({ ...selectedStudent, sex: e.target.value as any })}>
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Program</Form.Label>
                    <Form.Control type="text" value={selectedStudent.program} onChange={(e) => setSelectedStudent({ ...selectedStudent, program: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Municipality</Form.Label>
                    <Form.Control type="text" value={selectedStudent.municipality || ''} onChange={(e) => { const newMunicipality = e.target.value; const newAreaType = getAreaType(newMunicipality); setSelectedStudent({ ...selectedStudent, municipality: newMunicipality, areaType: newAreaType }); }} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>SHS Type</Form.Label>
                    <Form.Select value={selectedStudent.SHS_type || ''} onChange={(e) => setSelectedStudent({ ...selectedStudent, SHS_type: e.target.value })}>
                      <option value="">Select SHS Type</option>
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Income</Form.Label>
                    <Form.Control type="number" value={selectedStudent.income} onChange={(e) => setSelectedStudent({ ...selectedStudent, income: parseFloat(e.target.value) })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>GWA</Form.Label>
                    <Form.Control type="number" value={selectedStudent.GWA} onChange={(e) => setSelectedStudent({ ...selectedStudent, GWA: parseFloat(e.target.value) })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Area Type (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.areaType || getAreaType(selectedStudent.municipality)} disabled />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Honors (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.Honors} disabled />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Income Category (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.IncomeCategory} disabled />
                  </Form.Group>
                </Form>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSave}>Save Changes</Button>
            </Modal.Footer>
          </Modal>

          {/* Record view modal (read-only) */}
          <RecordViewModal
            show={showViewModal}
            onHide={() => setShowViewModal(false)}
            title="Student Details"
            fields={viewedStudent ? [
              { label: 'First Name', value: viewedStudent.firstname || '—' },
              { label: 'Last Name', value: viewedStudent.lastname || '—' },
              { label: 'Sex', value: viewedStudent.sex || '—' },
              { label: 'Program', value: viewedStudent.program || '—' },
              { label: 'Municipality', value: viewedStudent.municipality || '—' },
              { label: 'Area Type', value: getAreaType(viewedStudent.municipality) },
              { label: 'Income', value: viewedStudent.income === -1 || viewedStudent.income === null ? '—' : `₱${viewedStudent.income.toLocaleString()}` },
              { label: 'SHS Type', value: viewedStudent.SHS_type || '—' },
              { label: 'GWA', value: viewedStudent.GWA === -1 || viewedStudent.GWA === null ? '—' : viewedStudent.GWA },
              { label: 'Honors', value: viewedStudent.Honors || '—' },
              { label: 'Income Category', value: viewedStudent.IncomeCategory || '—' },
            ] : []}
          />
        </div>
      </div>
    </div>
  )
}

export default Students
