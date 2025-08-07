import React from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface Props {
  coherenceScores: {
    psi: number
    rho: number
    q: number
    f: number
  }
}

export default function CoherenceChart({ coherenceScores }: Props) {
  const data = {
    labels: ['ψ (Consciousness)', 'ρ (Density)', 'q (Charge)', 'f (Frequency)'],
    datasets: [
      {
        label: 'Coherence',
        data: [coherenceScores.psi, coherenceScores.rho, coherenceScores.q, coherenceScores.f],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
      },
    ],
  }

  const options = {
    scales: {
      r: {
        angleLines: {
          display: true,
        },
        suggestedMin: 0,
        suggestedMax: 1,
        ticks: {
          stepSize: 0.2,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  }

  return (
    <div className="h-48">
      <Radar data={data} options={options} />
    </div>
  )
}