import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  ReferenceLine,
  Cell
} from "recharts";

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

export default function SimulatedReturnsTool() {
  const [drift, setDrift] = useState(3);
  const [volatility, setVolatility] = useState(17);
  const [months, setMonths] = useState(12);

  const [chartData, setChartData] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [returnData, setReturnData] = useState([]);
  const [showReturnTable, setShowReturnTable] = useState(false);
  
  // Store fixed random numbers separate from inputs
  const randomSequence = useRef([]);
  const [seedVersion, setSeedVersion] = useState(0);

  // Input validation
  const validateInputs = () => {
    const errors = [];
    if (drift < 0 || drift > 50) errors.push("Drift must be between 0% and 50%");
    if (volatility < 0 || volatility > 100) errors.push("Volatility must be between 0% and 100%");
    if (months < 1 || months > 120) errors.push("Months must be between 1 and 120");
    return errors;
  };

  const inputErrors = validateInputs();

  // Generate a fixed sequence of random numbers
  function generateRandomSequence(length) {
    const sequence = [];
    for (let i = 0; i < length; i++) {
      const rand = Math.random();
      const norm = Math.sqrt(-2 * Math.log(rand)) * Math.cos(2 * Math.PI * Math.random());
      sequence.push(norm);
    }
    return sequence;
  }

  // Calculate returns using fixed random sequence + current parameters
  function calculateReturns() {
    if (inputErrors.length > 0) return;

    // Ensure we have enough random numbers
    if (randomSequence.current.length < months) {
      randomSequence.current = generateRandomSequence(Math.max(120, months));
    }

    let returns = [];
    let cumulative = [100];

    for (let i = 0; i < months; i++) {
      const norm = randomSequence.current[i];
      const monthlyReturn = (drift / 12) / 100 + (volatility / 100) * norm / Math.sqrt(12);

      returns.push(monthlyReturn);
      cumulative.push(cumulative[i] * (1 + monthlyReturn));
    }

    // Create chart data
    const chartDataPoints = cumulative.map((value, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() + index);
      return {
        month: index,
        monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        portfolioValue: value,
        monthlyReturn: index === 0 ? null : returns[index - 1] * 100
      };
    });

    // Calculate statistics
    const arithMean = returns.reduce((a, b) => a + b, 0) / months;
    const geomMean = Math.pow(cumulative[months] / 100, 1 / months) - 1;
    const volatilityAnnual = Math.sqrt(
      returns.map(r => Math.pow(r - arithMean, 2)).reduce((a, b) => a + b, 0) / months
    ) * Math.sqrt(12);
    const holdingPeriod = cumulative[months] / 100 - 1;

    const statsArray = [
      { 
        name: 'Arithmetic Mean (Annual)', 
        value: arithMean * 12 * 100, 
        shortName: 'Arith. Mean (Ann.)',
        isPercentage: true 
      },
      { 
        name: 'Geometric Mean (Annual)', 
        value: (Math.pow(1 + geomMean, 12) - 1) * 100, 
        shortName: 'Geom. Mean (Ann.)',
        isPercentage: true 
      },
      { 
        name: 'Volatility (Annual)', 
        value: volatilityAnnual * 100, 
        shortName: 'Volatility (Ann.)',
        isPercentage: true 
      },
      { 
        name: 'Holding Period Return', 
        value: holdingPeriod * 100, 
        shortName: 'Hold. Period Return',
        isPercentage: true 
      }
    ];

    setChartData(chartDataPoints);
    setStatsData(statsArray);
    setReturnData([null, ...returns.map(r => r * 100)]);
  }

  // Initialize random sequence on first load
  useEffect(() => {
    randomSequence.current = generateRandomSequence(120);
    calculateReturns();
  }, [seedVersion]);

  // Recalculate when inputs change
  useEffect(() => {
    if (randomSequence.current.length > 0) {
      const timeout = setTimeout(() => calculateReturns(), 100);
      return () => clearTimeout(timeout);
    }
  }, [drift, volatility, months]);

  // Function to generate new random sequence
  function regenerateRandomNumbers() {
    setSeedVersion(prev => prev + 1);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="font-medium">{`Month: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4">
        <Card title="Simulated Portfolio Returns" className="w-full">
          {/* Input Section */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <label className="flex flex-col" htmlFor="drift-input">
              Drift (% annualized) <span className="text-gray-500 text-xs">(0 - 50)</span>
              <input 
                id="drift-input"
                type="number" 
                min="0" 
                max="50"
                step="0.1"
                value={drift} 
                onChange={e => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setDrift(value);
                }} 
                className="mt-1 rounded-lg border px-3 py-2"
                aria-describedby="drift-help"
              />
              <span id="drift-help" className="sr-only">Enter expected annual return percentage between 0 and 50</span>
            </label>
            
            <label className="flex flex-col" htmlFor="volatility-input">
              Volatility (% annualized) <span className="text-gray-500 text-xs">(0 - 100)</span>
              <input 
                id="volatility-input"
                type="number" 
                min="0" 
                max="100"
                step="0.1"
                value={volatility} 
                onChange={e => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setVolatility(value);
                }} 
                className="mt-1 rounded-lg border px-3 py-2"
                aria-describedby="volatility-help"
              />
              <span id="volatility-help" className="sr-only">Enter annual volatility percentage between 0 and 100</span>
            </label>
            
            <label className="flex flex-col" htmlFor="months-input">
              Number of Months <span className="text-gray-500 text-xs">(1 - 120)</span>
              <input 
                id="months-input"
                type="number" 
                min="1" 
                max="120"
                step="1"
                value={months} 
                onChange={e => {
                  const value = e.target.value === '' ? 1 : Number(e.target.value);
                  setMonths(value);
                }} 
                className="mt-1 rounded-lg border px-3 py-2"
                aria-describedby="months-help"
              />
              <span id="months-help" className="sr-only">Enter simulation period in months between 1 and 120</span>
            </label>
          </div>

          {/* Error Messages */}
          {inputErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <div className="text-red-800 text-sm">
                <strong>Input Errors:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {inputErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Portfolio Value Chart */}
          {chartData.length > 0 && inputErrors.length === 0 && (
            <>
              <div className="mb-4">
                <h3 className="font-serif text-lg text-slate-700 mb-2">Portfolio Value Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthLabel" 
                        label={{ value: 'Month', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        label={{ value: 'Portfolio Value ($)', angle: -90, position: 'insideLeft', offset: 10 }}
                        tickFormatter={(value) => value.toFixed(0)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="portfolioValue" 
                        stroke="#4476FF" 
                        strokeWidth={2}
                        dot={false}
                        name="Portfolio Value ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={regenerateRandomNumbers}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  aria-describedby="regenerate-help"
                >
                  Generate New Random Sequence
                </button>
                
                <button
                  onClick={() => setShowReturnTable(!showReturnTable)}
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  aria-expanded={showReturnTable}
                  aria-controls="return-table"
                >
                  {showReturnTable ? 'Hide' : 'Show'} Return Table
                </button>
              </div>
              
              <p id="regenerate-help" className="text-xs text-gray-600 mb-4">
                Input changes use the same random numbers for easy comparison. Click "Generate New Random Sequence" for different results.
              </p>

              {/* Return Statistics Chart */}
              <div className="mb-6">
                <h3 className="font-serif text-lg text-slate-700 mb-2">Return Statistics</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData}
                      margin={{ top: 30, right: 30, left: 30, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="shortName" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis 
                        label={{ value: 'Return (%)', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => value.toFixed(1)}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
                        labelFormatter={(label, payload) => {
                          const item = statsData.find(d => d.shortName === label);
                          return item ? item.name : label;
                        }}
                      />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                      <Bar 
                        dataKey="value" 
                        name="Return"
                      >
                        {statsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#000000" : "#dc2626"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Black bars indicate positive returns, red bars indicate negative returns. 
                  <span className="sr-only">Zero reference line shows break-even point.</span>
                </p>
              </div>
            </>
          )}

          {/* Return Table */}
          {showReturnTable && chartData.length > 0 && inputErrors.length === 0 && (
            <div id="return-table" className="mt-6">
              <h3 className="font-serif text-lg text-slate-700 mb-3">Detailed Returns Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <caption className="sr-only">
                    Monthly portfolio returns and cumulative values over {months} month period
                  </caption>
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-left font-semibold">
                        Metric
                      </th>
                      {chartData.map((data, i) => (
                        <th key={i} scope="col" className="border border-gray-300 px-2 py-2 text-center font-mono text-xs min-w-16">
                          {data.monthLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row" className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">
                        Monthly Return (%)
                      </th>
                      {returnData.map((val, i) => (
                        <td key={i} className="border border-gray-300 px-2 py-2 text-center font-mono text-xs">
                          {val === null ? '—' : (
                            <span className={val >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {val.toFixed(2)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row" className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">
                        Portfolio Value ($)
                      </th>
                      {chartData.map((data, i) => (
                        <td key={i} className="border border-gray-300 px-2 py-2 text-center font-mono text-xs">
                          {data.portfolioValue.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Educational Note */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Monte Carlo Simulation:</strong> This tool simulates portfolio returns using random 
              number generation based on normal distribution assumptions. The same random sequence is maintained 
              when changing parameters to allow direct comparison of how different drift and volatility assumptions 
              affect portfolio outcomes.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}