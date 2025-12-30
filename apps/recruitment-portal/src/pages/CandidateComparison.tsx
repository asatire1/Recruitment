// ============================================================================
// Allied Recruitment Portal - Candidate Comparison View (R10.7)
// Location: apps/recruitment-portal/src/pages/CandidateComparison.tsx
// ============================================================================

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import type { Candidate } from '@allied/shared-lib'
import type { InterviewFeedback, CriterionCategory } from '@allied/shared-lib'
import { RECOMMENDATION_LABELS, RECOMMENDATION_COLORS, CRITERION_CATEGORY_LABELS } from '@allied/shared-lib'
import { Card, Button, Spinner } from '@allied/shared-ui'
import { StarDisplay } from '../components/feedback/StarRating'
import './CandidateComparison.css'

interface ComparisonCandidate {
  candidate: Candidate
  feedback: InterviewFeedback[]
  aggregateScore: number
  categoryScores: Record<string, number>
  latestRecommendation: string | null
}

export default function CandidateComparison() {
  const [searchParams] = useSearchParams()
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Get candidate IDs from URL (e.g., ?ids=abc,def,ghi)
  const candidateIds = useMemo(() => {
    const idsParam = searchParams.get('ids')
    return idsParam ? idsParam.split(',').slice(0, 5) : [] // Max 5 candidates
  }, [searchParams])

  useEffect(() => {
    async function loadComparison() {
      if (candidateIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const db = getFirebaseDb()
        const comparisonData: ComparisonCandidate[] = []

        for (const candidateId of candidateIds) {
          // Load candidate
          const candidateDoc = await getDoc(doc(db, 'candidates', candidateId))
          if (!candidateDoc.exists()) continue
          const candidate = { id: candidateDoc.id, ...candidateDoc.data() } as Candidate

          // Load feedback
          const feedbackQuery = query(
            collection(db, 'interviewFeedback'),
            where('candidateId', '==', candidateId),
            where('status', 'in', ['submitted', 'reviewed'])
          )
          const feedbackSnap = await getDocs(feedbackQuery)
          const feedback = feedbackSnap.docs.map(d => ({ id: d.id, ...d.data() })) as InterviewFeedback[]

          // Calculate aggregate scores
          let totalScore = 0
          const categoryTotals: Record<string, { sum: number; count: number }> = {}

          feedback.forEach(f => {
            if (f.scores?.weightedAverage) {
              totalScore += f.scores.weightedAverage
            }
            if (f.scores?.categoryScores) {
              Object.entries(f.scores.categoryScores).forEach(([cat, data]) => {
                if (!categoryTotals[cat]) categoryTotals[cat] = { sum: 0, count: 0 }
                categoryTotals[cat].sum += data.average
                categoryTotals[cat].count += 1
              })
            }
          })

          const categoryScores: Record<string, number> = {}
          Object.entries(categoryTotals).forEach(([cat, data]) => {
            categoryScores[cat] = data.count > 0 ? data.sum / data.count : 0
          })

          const latestFeedback = feedback.sort((a, b) => 
            (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0)
          )[0]

          comparisonData.push({
            candidate,
            feedback,
            aggregateScore: feedback.length > 0 ? totalScore / feedback.length : 0,
            categoryScores,
            latestRecommendation: latestFeedback?.recommendation || null,
          })
        }

        setCandidates(comparisonData)
        setSelectedIds(candidateIds)
      } catch (err) {
        console.error('Error loading comparison:', err)
      } finally {
        setLoading(false)
      }
    }

    loadComparison()
  }, [candidateIds])

  // Get all unique categories across all candidates
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    candidates.forEach(c => {
      Object.keys(c.categoryScores).forEach(cat => cats.add(cat))
    })
    return Array.from(cats)
  }, [candidates])

  // Find best score for each category (for highlighting)
  const bestScores = useMemo(() => {
    const best: Record<string, { score: number; candidateId: string }> = {}
    allCategories.forEach(cat => {
      let maxScore = 0
      let maxId = ''
      candidates.forEach(c => {
        if ((c.categoryScores[cat] || 0) > maxScore) {
          maxScore = c.categoryScores[cat]
          maxId = c.candidate.id
        }
      })
      best[cat] = { score: maxScore, candidateId: maxId }
    })
    return best
  }, [candidates, allCategories])

  if (loading) {
    return (
      <div className="page comparison-page">
        <div className="loading-state"><Spinner size="lg" /><p>Loading comparison...</p></div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="page comparison-page">
        <div className="empty-state">
          <h3>No candidates to compare</h3>
          <p>Select candidates from the candidates list to compare them.</p>
          <Link to="/candidates"><Button variant="primary">Go to Candidates</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page comparison-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Comparison</h1>
          <p className="page-description">Comparing {candidates.length} candidates side by side</p>
        </div>
        <Link to="/candidates"><Button variant="secondary">← Back to Candidates</Button></Link>
      </div>

      {/* Comparison Table */}
      <div className="comparison-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="category-header">Criteria</th>
              {candidates.map(c => (
                <th key={c.candidate.id} className="candidate-header">
                  <Link to={`/candidates/${c.candidate.id}`} className="candidate-name">
                    {c.candidate.firstName} {c.candidate.lastName}
                  </Link>
                  {c.candidate.currentJobTitle && (
                    <span className="candidate-title">{c.candidate.currentJobTitle}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Overall Score Row */}
            <tr className="overall-row">
              <td className="row-label">Overall Score</td>
              {candidates.map(c => (
                <td key={c.candidate.id} className="score-cell">
                  <div className="overall-score">
                    <StarDisplay value={c.aggregateScore} size="md" />
                    <span className="score-number">{c.aggregateScore.toFixed(1)}</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Recommendation Row */}
            <tr>
              <td className="row-label">Latest Recommendation</td>
              {candidates.map(c => (
                <td key={c.candidate.id} className="score-cell">
                  {c.latestRecommendation ? (
                    <span 
                      className="recommendation-badge"
                      style={{ 
                        backgroundColor: `${RECOMMENDATION_COLORS[c.latestRecommendation as keyof typeof RECOMMENDATION_COLORS]}15`,
                        color: RECOMMENDATION_COLORS[c.latestRecommendation as keyof typeof RECOMMENDATION_COLORS]
                      }}
                    >
                      {RECOMMENDATION_LABELS[c.latestRecommendation as keyof typeof RECOMMENDATION_LABELS]}
                    </span>
                  ) : (
                    <span className="no-data">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Feedback Count Row */}
            <tr>
              <td className="row-label">Feedback Received</td>
              {candidates.map(c => (
                <td key={c.candidate.id} className="score-cell">
                  <span className="feedback-count">{c.feedback.length}</span>
                </td>
              ))}
            </tr>

            {/* Category Scores */}
            {allCategories.map(cat => (
              <tr key={cat}>
                <td className="row-label">{CRITERION_CATEGORY_LABELS[cat as CriterionCategory] || cat}</td>
                {candidates.map(c => {
                  const score = c.categoryScores[cat] || 0
                  const isBest = bestScores[cat]?.candidateId === c.candidate.id && score > 0
                  return (
                    <td key={c.candidate.id} className={`score-cell ${isBest ? 'best-score' : ''}`}>
                      {score > 0 ? (
                        <div className="category-score">
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${(score / 5) * 100}%` }} />
                          </div>
                          <span className="score-value">{score.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Strengths Summary */}
            <tr className="text-row">
              <td className="row-label">Key Strengths</td>
              {candidates.map(c => {
                const strengths = c.feedback
                  .filter(f => f.strengths)
                  .map(f => f.strengths)
                  .slice(0, 2)
                return (
                  <td key={c.candidate.id} className="text-cell">
                    {strengths.length > 0 ? (
                      <ul className="text-list">
                        {strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    ) : (
                      <span className="no-data">No feedback</span>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Concerns Summary */}
            <tr className="text-row">
              <td className="row-label">Concerns</td>
              {candidates.map(c => {
                const concerns = c.feedback
                  .filter(f => f.concerns)
                  .map(f => f.concerns)
                  .slice(0, 2)
                return (
                  <td key={c.candidate.id} className="text-cell">
                    {concerns.length > 0 ? (
                      <ul className="text-list concerns">
                        {concerns.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    ) : (
                      <span className="no-data">None noted</span>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
