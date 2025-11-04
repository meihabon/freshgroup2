import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner, Alert, Modal, Table, Accordion } from 'react-bootstrap'
import { Users, GraduationCap, MapPin, Coins, School, Award, User } from 'lucide-react'
import Plot from 'react-plotly.js'
import { useAuth } from "../context/AuthContext"

interface DashboardStats {
  total_students: number
  most_common_program: string
  most_common_municipality: string
  most_common_sex: string
  most_common_income: string
  most_common_school: string
  most_common_shs: string
  most_common_honors: string
  sex_distribution: Record<string, number>
  program_distribution: Record<string, number>
  municipality_distribution: Record<string, number>
  income_distribution: Record<string, number>
  shs_distribution: Record<string, number>
  school_distribution: Record<string, number>
  honors_distribution: Record<string, number>
}

function Dashboard() {
  const { API } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalData, setModalData] = useState<{ title: string; data: Record<string, number> } | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await API.get<DashboardStats>('/dashboard/stats')
      setStats(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

  const openModal = (title: string, data: Record<string, number>) => {
    setModalData({ title, data })
  }

  const closeModal = () => setModalData(null)

  // Interpretation generator for the chart descriptions
  const getInterpretation = (title: string, data?: Record<string, number>) => {
    if (!data || Object.keys(data).length === 0) return 'No data available for interpretation.'

    const total = Object.values(data).reduce((a, b) => a + b, 0)
    const maxCategory = Object.keys(data).reduce((a, b) => (data[a] > data[b] ? a : b))
    const maxValue = data[maxCategory] ?? 0
    const percentage = total > 0 ? ((maxValue / total) * 100).toFixed(1) : '0.0'

    switch (title) {
      case 'Sex Distribution':
        return `Most students identify as ${maxCategory} (${percentage}% of the sample). This helps target gender-sensitive programs and ensures equitable student services.`
      case 'Program Distribution':
        return `The largest share of students are enrolled in ${maxCategory} (${percentage}%). This indicates high demand for this program and can inform resource allocation and curriculum planning.`
      case 'Municipality Distribution':
        return `${maxCategory} contributes the highest number of students (${percentage}%). This is useful for regional outreach, scholarship targeting, and transport planning.`
      case 'Income Distribution':
        return `The ${maxCategory} income tier accounts for ${percentage}% of students. This is important for financial aid, scholarship prioritization, and student support planning.`
      case 'SHS Type Distribution':
        return `${maxCategory} is the predominant SHS background (${percentage}%), which may indicate differences in academic preparation and the need for bridging programs.`
      case 'SHS Origin Distribution':
        return `${maxCategory} is the most common senior high school origin (${percentage}%), suggesting that certain schools contribute more students to this cluster. This pattern can help identify feeder schools for targeted partnerships or outreach programs.`;
      case 'Honors Distribution':
        return `${maxCategory} represents ${percentage}% of students in honors classification. This gives a quick snapshot of academic achievement and recognition opportunities.`
      default:
        return 'This chart provides insights into student demographics and academic characteristics.'
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>
  }

  if (!stats) {
    return <Alert variant="warning">No data available. Please upload a dataset first.</Alert>
  }

  const distributionCharts = [
    { title: 'Sex Distribution', data: stats.sex_distribution },
    { title: 'Program Distribution', data: stats.program_distribution },
    { title: 'Municipality Distribution', data: stats.municipality_distribution },
    { title: 'Income Distribution', data: stats.income_distribution },
    { title: 'SHS Type Distribution', data: stats.shs_distribution },
    { title: 'SHS Origin Distribution', data: stats.school_distribution },
    { title: 'Honors Distribution', data: stats.honors_distribution },
  ]

  return (
    <div className="fade-in">
      {/* Title */}
      <div className="mb-4">
        <h2 className="fw-bold">DASHBOARD</h2>
      </div>


      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Accordion>
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                Why These Data Are Critical for the Institution
              </Accordion.Header>
              <Accordion.Body>
                <p className="text-muted">
                  The following indicators were carefully selected because they directly support
                  academic planning, policy-making, student support services, and institutional
                  accreditation. Each dataset provides actionable insights that enable
                  evidence-based decision-making.
                </p>

                <Row>
                  <Col md={6}>
                    <ul>
                      <li>
                        <b>Income:</b> Identifies students in financial need for
                        <i> scholarship prioritization, tuition assistance, and equity programs</i>.
                        Crucial for OSAS and Finance in targeting support fairly.
                      </li>
                      <li>
                        <b>Sex:</b> Enables
                        <i> gender-sensitive programming and compliance with CHED gender policies</i>.
                        Ensures equal opportunities in leadership, facilities, and student services.
                      </li>
                      <li>
                        <b>Program:</b> Highlights the most in-demand courses, guiding
                        <i> curriculum development, faculty allocation, and resource distribution</i>.
                        Essential for deans in strategic planning.
                      </li>
                    </ul>
                  </Col>

                  <Col md={6}>
                    <ul>
                      <li>
                        <b>Municipality:</b> Maps student origins for
                        <i> outreach, transportation planning, and regional access programs</i>.
                        Helps Admin assess geographic inclusivity.
                      </li>
                      <li>
                        <b>SHS Type:</b> Differentiates public vs. private feeder schools, revealing
                        <i> academic preparation gaps</i>. Faculty and Guidance can use this to design
                        bridging programs or remedial support.
                      </li>
                      <li>
                        <b>SHS Origin:</b> Identifies the specific senior high schools attended by students, uncovering 
                        <i> feeder school patterns</i> that influence student readiness. This helps the institution 
                        <i> strengthen partnerships</i> and align academic support with originating schools.
                      </li>
                      <li>
                        <b>Honors:</b> Recognizes achievers and supports
                        <i> merit-based scholarships, recognition programs, and academic excellence tracking</i>.
                        Provides benchmarks for overall student performance.
                      </li>
                    </ul>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Card.Body>
      </Card>

      {/* Key Metrics Section */}
      <h4 className="fw-bold mb-3">SUMMARY</h4>
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('Sex Breakdown', stats.sex_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <User size={40} className="text-success me-3" />
              <div>
                <h5 className="fw-bold mb-1">{stats.most_common_sex}</h5>
                <p className="text-muted mb-0">Most Common Sex</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('Program Breakdown', stats.program_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <GraduationCap size={40} className="text-success me-3" />
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_program}</h6>
                <p className="text-muted mb-0">Most Common Program</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('Municipality Breakdown', stats.municipality_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <MapPin size={40} className="text-warning me-3" />
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_municipality}</h6>
                <p className="text-muted mb-0">Most Common Municipality</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('Income Breakdown', stats.income_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <Coins size={40} className="text-warning me-3" /> 
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_income}</h6>
                <p className="text-muted mb-0">Most Common Income</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('SHS Breakdown', stats.shs_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <School size={40} className="text-info me-3" />
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_shs}</h6>
                <p className="text-muted mb-0">Most Common SHS Type</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card
            className="h-100 clickable-card"
            onClick={() => openModal('SHS Origin Breakdown', stats.school_distribution)}
          >
            <Card.Body className="d-flex align-items-center">
              <School size={40} className="text-primary me-3" />
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_school}</h6>
                <p className="text-muted mb-0">Most Common SHS Origin</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 clickable-card" onClick={() => openModal('Honors Breakdown', stats.honors_distribution)}>
            <Card.Body className="d-flex align-items-center">
              <Award size={40} className="text-success me-3" />
              <div>
                <h6 className="fw-bold mb-1">{stats.most_common_honors}</h6>
                <p className="text-muted mb-0">Most Common Honors</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <Users size={40} className="text-success me-3" />
              <div>
                <h3 className="fw-bold mb-1">{formatNumber(stats.total_students)}</h3>
                <p className="text-muted mb-0">Total Students</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card 
            className="h-100 clickable-card hover-shadow" 
            onClick={() => window.location.href = "/clusters"}
          >
            <Card.Body className="d-flex align-items-center">
              <Users size={40} className="text-primary me-3" />
              <div>
                <h5 className="fw-bold mb-1">View Clusters</h5>
                <p className="text-muted mb-0">
                  Explore student groupings from the latest dataset
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* Distribution Charts */}
      <h4 className="fw-bold mb-3">Distribution Charts</h4>
      <Row>
        {distributionCharts.map((chart, idx) => (
          <Col lg={4} md={6} key={idx} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="fw-bold">{chart.title}</Card.Header>
              <Card.Body>
                <Plot
                  data={[
                    {
                      type: 'pie',
                      labels: Object.keys(chart.data || {}),
                      values: Object.values(chart.data || {}),
                      hole: 0.4,
                      textinfo: 'label+percent',
                      textposition: 'outside',
                    },
                  ]}
                  layout={{
                    height: 300,
                    margin: { t: 20, b: 20, l: 20, r: 20 },
                    showlegend: false,
                    font: { size: 11 },
                  }}
                  config={{ displayModeBar: false }}
                  style={{ width: '100%' }}
                />

              <Accordion className="mt-3">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Interpretation</Accordion.Header>
                  <Accordion.Body>
                    <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                      {getInterpretation(chart.title, chart.data)}
                    </p>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal for Breakdown */}
      <Modal show={!!modalData} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modalData?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {modalData &&
                Object.entries(modalData.data).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default Dashboard
