import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Modal,
  Table,
  Accordion,
  Form
} from 'react-bootstrap'
import {
  Users,
  GraduationCap,
  MapPin,
  Coins,
  School,
  Award,
  User,
  PieChart, BarChart2 
} from 'lucide-react'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'alphabetical' | 'count'>('alphabetical')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [chartView, setChartView] = useState<'doughnut' | 'bar'>('doughnut')
  const [chartSortBy, setChartSortBy] = useState<'alphabetical' | 'count'>('alphabetical')
  const [chartSortOrder, setChartSortOrder] = useState<'asc' | 'desc'>('asc')

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
    setSearchTerm('')
    setSortBy('alphabetical')
    setSortOrder('asc')
    setModalData({ title, data })
  }

  const closeModal = () => setModalData(null)

// Interpretation helper
const getInterpretation = (title: string, data?: Record<string, number>): string => {
  if (!data || Object.keys(data).length === 0)
    return 'No data available for interpretation.';

  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  // Detect most & least automatically
  const maxEntry = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const minEntry = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  const [maxCategory, maxValue] = maxEntry;
  const [minCategory, minValue] = minEntry;

  const percentage = total > 0 ? ((maxValue / total) * 100).toFixed(1) : '0.0';
  const leastPercentage = total > 0 ? ((minValue / total) * 100).toFixed(1) : '0.0';

  switch (title) {
    case 'Sex Distribution':
      return `The majority of students are identified as ${maxCategory}, comprising ${percentage}%. In contrast, only ${leastPercentage}% are identified as ${minCategory}.`;

    case 'Program Distribution':
      return `The highest enrollment is observed in the ${maxCategory} program (${percentage}%), while the ${minCategory} program has the lowest enrollment (${leastPercentage}%).`;

    case 'Municipality Distribution':
      return `A greater number of students are from ${maxCategory} (${percentage}%), whereas the fewest are from ${minCategory} (${leastPercentage}%).`;

    case 'Income Distribution':
      return `Students belonging to the ${maxCategory.toLowerCase()} income bracket constitute the largest group (${percentage}%), while those in the ${minCategory.toLowerCase()} income bracket form the smallest (${leastPercentage}%).`;

    case 'SHS Type Distribution':
      return `Most respondents are graduates of ${maxCategory.toLowerCase()} senior high schools (${percentage}%), with only ${leastPercentage}% graduating from ${minCategory.toLowerCase()} schools.`;

    case 'SHS Origin Distribution':
      return `The most common senior high school of origin is ${maxCategory} (${percentage}%), while ${minCategory} represents the least (${leastPercentage}%).`;

    case 'Honors Distribution':
      return `The largest proportion of honors classifications is attributed to ${maxCategory} students (${percentage}%), whereas ${minCategory} students account for the smallest share (${leastPercentage}%).`;

    default:
      return 'This chart illustrates notable patterns in student demographics and academic characteristics.';
  }
};

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (error) return <Alert variant="danger">{error}</Alert>
  if (!stats) return <Alert variant="warning">No data available. Please upload a dataset first.</Alert>

  const distributionCharts = [
    { title: 'Sex Distribution', data: stats.sex_distribution },
    { title: 'Program Distribution', data: stats.program_distribution },
    { title: 'Municipality Distribution', data: stats.municipality_distribution },
    { title: 'Income Distribution', data: stats.income_distribution },
    { title: 'SHS Type Distribution', data: stats.shs_distribution },
    { title: 'SHS Origin Distribution', data: stats.school_distribution },
    { title: 'Honors Distribution', data: stats.honors_distribution },
  ]

  const filteredAndSortedData = modalData
    ? Object.entries(modalData.data)
        .filter(([key]) => key.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
          if (sortBy === 'alphabetical') {
            return sortOrder === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
          } else {
            return sortOrder === 'asc' ? a[1] - b[1] : b[1] - a[1]
          }
        })
    : []

  return (
    <div className="fade-in">
      {/* TITLE */}
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
      {/* SUMMARY CARDS */}
      <h4 className="fw-bold mb-3">SUMMARY</h4>
      <Row className="mb-4">
        {[ 
          { icon: <User size={40} className="text-success me-3" />, title: stats.most_common_sex, label: 'Predominant Sex', data: stats.sex_distribution },
          { icon: <GraduationCap size={40} className="text-success me-3" />, title: stats.most_common_program, label: 'Most Enrolled Program', data: stats.program_distribution },
          { icon: <MapPin size={40} className="text-warning me-3" />, title: stats.most_common_municipality, label: 'Top Municipality of Origin', data: stats.municipality_distribution },
          { icon: <Coins size={40} className="text-warning me-3" />, title: stats.most_common_income, label: 'Dominant Income Group', data: stats.income_distribution },
          { icon: <School size={40} className="text-info me-3" />, title: stats.most_common_shs, label: 'Dominant SHS Type', data: stats.shs_distribution },
          { icon: <School size={40} className="text-primary me-3" />, title: stats.most_common_school, label: 'Top SHS Seeder', data: stats.school_distribution },
          { icon: <Award size={40} className="text-success me-3" />, title: stats.most_common_honors, label: 'Leading Honors Level', data: stats.honors_distribution },
        ].map((item, i) => (
          <Col md={3} key={i} className="mb-3">
            <Card
              className="h-100 clickable-card shadow-sm"
              style={{ cursor: 'pointer', transition: '0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onClick={() => openModal(item.label, item.data)}
            >
              <Card.Body className="d-flex align-items-center">
                {item.icon}
                <div>
                  <h6 className="fw-bold mb-1">{item.title}</h6>
                  <p className="text-muted mb-0">{item.label}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}

        <Col md={3} className="mb-3">
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

        <Col md={3} className="mb-3">
          <Card
            className="h-100 clickable-card"
            style={{ cursor: 'pointer', transition: '0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onClick={() => (window.location.href = '/clusters')}
          >
            <Card.Body className="d-flex align-items-center">
              <Users size={40} className="text-primary me-3" />
              <div>
                <h5 className="fw-bold mb-1">View Clusters</h5>
                <p className="text-muted mb-0">Explore student groupings from the latest dataset</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

{/* DISTRIBUTION CHARTS */}
<Row className="align-items-center justify-content-between mb-3">
  {/* Left side - title */}
  <Col xs="auto">
    <h4 className="fw-bold mb-0">Distribution Charts</h4>
  </Col>

  {/* Right side - toggle */}
  <Col xs="auto" className="d-flex align-items-center">
    <Form.Label className="fw-semibold mb-0 me-2">Chart View:</Form.Label>
    <div
      className="d-flex align-items-center border rounded-pill px-2 py-1 shadow-sm"
      style={{
        background: '#f8f9fa',
        gap: '8px',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
      }}
      onClick={() =>
        setChartView(chartView === 'bar' ? 'doughnut' : 'bar')
      }
    >
      {/* Doughnut icon */}
      <div
        className={`d-flex align-items-center justify-content-center rounded-circle p-2 ${
          chartView === 'doughnut' ? 'bg-success text-white' : 'text-muted'
        }`}
        style={{ transition: 'all 0.3s ease' }}
      >
        <PieChart size={18} />
      </div>
        <Form.Check
          type="switch"
          id="chart-view-toggle"
          checked={chartView === 'bar'}
          onChange={() =>
            setChartView(chartView === 'bar' ? 'doughnut' : 'bar')
          }
          className="m-0"
          style={{
            accentColor: '#28a745', // modern browsers
          }}
        />

      {/* Bar icon */}
      <div
        className={`d-flex align-items-center justify-content-center rounded-circle p-2 ${
          chartView === 'bar' ? 'bg-success text-white' : 'text-muted'
        }`}
        style={{ transition: 'all 0.3s ease' }}
      >
        <BarChart2 size={18} />
      </div>
    </div>
  </Col>
</Row>

      {/* Bar chart sorting controls */}
      {chartView === 'bar' && (
        <Row className="mb-3 align-items-center">
          <Col xs="auto" className="d-flex align-items-center gap-2 flex-wrap">
            <Form.Label className="fw-semibold mb-0">Sort by:</Form.Label>
            <Form.Select
              value={chartSortBy}
              onChange={e => setChartSortBy(e.target.value as 'alphabetical' | 'count')}
              style={{ width: '150px' }}
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="count">Count</option>
            </Form.Select>

            <Form.Select
              value={chartSortOrder}
              onChange={e => setChartSortOrder(e.target.value as 'asc' | 'desc')}
              style={{ width: '140px' }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Form.Select>
          </Col>
        </Row>
      )}

      {/* Charts rendering */}
      {chartView === 'bar' ? (
        <>
          {distributionCharts.map((chart, idx) => {
            const sortedEntries = Object.entries(chart.data || {}).sort((a, b) => {
              if (chartSortBy === 'alphabetical') {
                return chartSortOrder === 'asc'
                  ? a[0].localeCompare(b[0])
                  : b[0].localeCompare(a[0])
              } else {
                return chartSortOrder === 'asc' ? a[1] - b[1] : b[1] - a[1]
              }
            })
            const labels = sortedEntries.map(([k]) => k)
            const values = sortedEntries.map(([, v]) => v)

            return (
              <Card className="mb-4 shadow-sm" key={idx}>
                <Card.Header className="fw-bold">{chart.title}</Card.Header>
                <Card.Body>
                  <Plot
                    data={[
                      {
                        type: 'bar',
                        x: values,
                        y: labels,
                        orientation: 'h',
                        text: values.map(v => `${v} students`),
                        hovertemplate: '%{y}: %{x} students<extra></extra>', // ✅ nice tooltip
                        marker: {
                          color: labels.map(
                            (_, i) =>
                              `hsl(${(i * 360) / labels.length}, 70%, 55%)` // ✅ auto-generate vibrant rainbow colors
                          ),
                        },
                      },
                    ]}
                    layout={{
                      height: 400,
                      margin: { t: 20, b: 40, l: 150, r: 20 },
                      font: { size: 11 },
                      plot_bgcolor: '#fff',
                      paper_bgcolor: '#fff',
                    }}
                    config={{ displayModeBar: false }}
                    style={{ width: '100%' }}
                  />

                  <Accordion className="mt-3">
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>Interpretation</Accordion.Header>
                      <Accordion.Body>
                        <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                          {getInterpretation(chart.title, Object.fromEntries(sortedEntries))}
                        </p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Card.Body>
              </Card>
            )
          })}
        </>
      ) : (
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
                        hoverinfo: 'label+value+percent', // ✅ tooltip info
                        hovertemplate: '%{label}: %{value} students (%{percent})<extra></extra>',
                        marker: {
                          colors: [
                            '#4F46E5', '#22C55E', '#EAB308', '#06B6D4',
                            '#F43F5E', '#8B5CF6', '#F97316', '#14B8A6',
                            '#EC4899', '#A855F7', '#84CC16', '#E11D48'
                          ]
                        },
                        showlegend: false, // ✅ hide legend
                      }
                    ]}
                    layout={{
                      height: 300,
                      margin: { t: 20, b: 20, l: 20, r: 20 },
                      font: { size: 11 },
                      plot_bgcolor: '#fff',
                      paper_bgcolor: '#fff',
                      showlegend: false, // ✅ ensure hidden
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
      )}

      {/* MODAL */}
      <Modal show={!!modalData} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modalData?.title}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <Form.Control
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '250px' }}
            />

            <div className="d-flex gap-2">
              <Form.Select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'alphabetical' | 'count')}
                style={{ width: '180px' }}
              >
                <option value="alphabetical">Sort by: Alphabetical</option>
                <option value="count">Sort by: Count</option>
              </Form.Select>

              <Form.Select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                style={{ width: '160px' }}
              >
                <option value="asc">Order: Ascending</option>
                <option value="desc">Order: Descending</option>
              </Form.Select>
            </div>
          </div>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map(([key, value]) => (
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
