"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ProgressChartsProps {
  isArabic?: boolean;
  examType: "qudurat" | "tahsili";
  subType?: "general" | "gat" | "tahsili" | "saat";
}

export default function ProgressCharts({ isArabic = true, examType, subType }: ProgressChartsProps) {
  // Mock data - In real app, this would come from database
  const progressData = [
    { date: isArabic ? "١ يناير" : "Jan 1", score: 58, target: 95 },
    { date: isArabic ? "٨ يناير" : "Jan 8", score: 62, target: 95 },
    { date: isArabic ? "١٥ يناير" : "Jan 15", score: 65, target: 95 },
    { date: isArabic ? "٢٢ يناير" : "Jan 22", score: 68, target: 95 },
    { date: isArabic ? "٢٩ يناير" : "Jan 29", score: 71, target: 95 },
    { date: isArabic ? "٥ فبراير" : "Feb 5", score: 74, target: 95 },
    { date: isArabic ? "١٢ فبراير" : "Feb 12", score: 72, target: 95 },
    { date: isArabic ? "١٩ فبراير" : "Feb 19", score: 78, target: 95 },
  ];

  const quduratSectionData = isArabic ? [
    { name: "الجبر", current: 85, previous: 72 },
    { name: "الهندسة", current: 70, previous: 65 },
    { name: "الإحصاء", current: 75, previous: 60 },
    { name: "التناظر", current: 80, previous: 75 },
    { name: "الإكمال", current: 72, previous: 68 },
    { name: "الاستيعاب", current: 65, previous: 55 },
  ] : [
    { name: "Algebra", current: 85, previous: 72 },
    { name: "Geometry", current: 70, previous: 65 },
    { name: "Statistics", current: 75, previous: 60 },
    { name: "Analogies", current: 80, previous: 75 },
    { name: "Completion", current: 72, previous: 68 },
    { name: "Reading", current: 65, previous: 55 },
  ];

  const tahsiliSectionData = isArabic ? [
    { name: "الرياضيات", current: 88, previous: 75 },
    { name: "الفيزياء", current: 72, previous: 65 },
    { name: "الكيمياء", current: 65, previous: 58 },
    { name: "الأحياء", current: 80, previous: 72 },
  ] : [
    { name: "Mathematics", current: 88, previous: 75 },
    { name: "Physics", current: 72, previous: 65 },
    { name: "Chemistry", current: 65, previous: 58 },
    { name: "Biology", current: 80, previous: 72 },
  ];

  const sectionData = examType === "qudurat" ? quduratSectionData : tahsiliSectionData;

  const testHistoryData = [
    { name: isArabic ? "اختبار ١" : "Test 1", score: 62, date: "Jan 5" },
    { name: isArabic ? "اختبار ٢" : "Test 2", score: 68, date: "Jan 12" },
    { name: isArabic ? "اختبار ٣" : "Test 3", score: 65, date: "Jan 19" },
    { name: isArabic ? "اختبار ٤" : "Test 4", score: 72, date: "Jan 26" },
    { name: isArabic ? "اختبار ٥" : "Test 5", score: 75, date: "Feb 2" },
    { name: isArabic ? "اختبار ٦" : "Test 6", score: 78, date: "Feb 9" },
  ];

  const studyTimeData = isArabic ? [
    { name: "السبت", hours: 2.5 },
    { name: "الأحد", hours: 1.5 },
    { name: "الاثنين", hours: 3 },
    { name: "الثلاثاء", hours: 2 },
    { name: "الأربعاء", hours: 2.5 },
    { name: "الخميس", hours: 1 },
    { name: "الجمعة", hours: 0.5 },
  ] : [
    { name: "Sat", hours: 2.5 },
    { name: "Sun", hours: 1.5 },
    { name: "Mon", hours: 3 },
    { name: "Tue", hours: 2 },
    { name: "Wed", hours: 2.5 },
    { name: "Thu", hours: 1 },
    { name: "Fri", hours: 0.5 },
  ];

  const pieData = examType === "qudurat"
    ? [
        { name: isArabic ? "الكمي" : "Quantitative", value: 55, color: "#006C35" },
        { name: isArabic ? "اللفظي" : "Verbal", value: 45, color: "#D4AF37" },
      ]
    : [
        { name: isArabic ? "الرياضيات" : "Math", value: 30, color: "#3B82F6" },
        { name: isArabic ? "الفيزياء" : "Physics", value: 25, color: "#8B5CF6" },
        { name: isArabic ? "الكيمياء" : "Chemistry", value: 25, color: "#22C55E" },
        { name: isArabic ? "الأحياء" : "Biology", value: 20, color: "#EC4899" },
      ];

  interface TooltipEntry {
    name: string;
    value: number;
    color: string;
    unit?: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry: TooltipEntry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.unit || '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Progress Over Time - Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">📈</span>
          {isArabic ? "تطور الدرجات عبر الوقت" : "Score Progress Over Time"}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006C35" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#006C35" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#006C35"
                strokeWidth={3}
                fill="url(#colorScore)"
                name={isArabic ? "الدرجة" : "Score"}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#D4AF37"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={isArabic ? "الهدف" : "Target"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#006C35]" />
            <span className="text-gray-600 dark:text-gray-400">{isArabic ? "درجتك" : "Your Score"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#D4AF37]" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-600 dark:text-gray-400">{isArabic ? "الهدف" : "Target"}</span>
          </div>
        </div>
      </div>

      {/* Section Performance Comparison - Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span>
          {isArabic ? "مقارنة الأداء حسب الموضوع" : "Performance by Topic"}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="previous"
                fill="#94A3B8"
                radius={[4, 4, 0, 0]}
                name={isArabic ? "سابقاً" : "Previous"}
              />
              <Bar
                dataKey="current"
                fill="#006C35"
                radius={[4, 4, 0, 0]}
                name={isArabic ? "الآن" : "Current"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isArabic ? "مقارنة بين آخر اختبارين" : "Comparison between last two tests"}
        </p>
      </div>

      {/* Test History & Study Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📝</span>
            {isArabic ? "نتائج الاختبارات" : "Test Results"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testHistoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#006C35"
                  strokeWidth={3}
                  dot={{ fill: '#006C35', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#D4AF37' }}
                  name={isArabic ? "الدرجة" : "Score"}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Time Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">⏰</span>
            {isArabic ? "ساعات الدراسة هذا الأسبوع" : "Study Hours This Week"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyTimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                          <p className="text-sm text-[#D4AF37]">
                            {payload[0].value} {isArabic ? "ساعة" : "hours"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill="#D4AF37"
                  radius={[4, 4, 0, 0]}
                  name={isArabic ? "ساعات" : "Hours"}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            {isArabic ? `المجموع: ${studyTimeData.reduce((a, b) => a + b.hours, 0)} ساعة` : `Total: ${studyTimeData.reduce((a, b) => a + b.hours, 0)} hours`}
          </p>
        </div>
      </div>

      {/* Time Distribution Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">🎯</span>
          {isArabic ? "توزيع وقت الدراسة" : "Study Time Distribution"}
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
                          <p className="text-sm" style={{ color: payload[0].payload.color }}>
                            {payload[0].value}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mr-auto">{item.value}%</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {isArabic
                ? "النسبة المئوية من إجمالي وقت الدراسة لكل قسم"
                : "Percentage of total study time per section"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#006C35] to-[#00A651] rounded-2xl p-4 text-white">
          <div className="text-3xl font-bold">+16%</div>
          <div className="text-sm text-white/80">{isArabic ? "تحسن الدرجة" : "Score Improvement"}</div>
        </div>
        <div className="bg-gradient-to-br from-[#D4AF37] to-[#E8C547] rounded-2xl p-4 text-black">
          <div className="text-3xl font-bold">6</div>
          <div className="text-sm text-black/70">{isArabic ? "اختبارات مكتملة" : "Tests Completed"}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <div className="text-3xl font-bold">13h</div>
          <div className="text-sm text-white/80">{isArabic ? "ساعات الدراسة" : "Study Hours"}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="text-3xl font-bold">78%</div>
          <div className="text-sm text-white/80">{isArabic ? "أعلى درجة" : "Best Score"}</div>
        </div>
      </div>

      {/* Streak & Goals Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Streak Tracker */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🔥</span>
            {isArabic ? "سلسلة التدريب" : "Practice Streak"}
          </h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-5xl font-bold text-[#D4AF37]">7</div>
            <div className="text-gray-500 dark:text-gray-400">
              {isArabic ? "أيام متتالية" : "days in a row"}
            </div>
          </div>
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  day <= 7 ? "bg-[#006C35] text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                }`}
              >
                {isArabic ? ["س", "أ", "ث", "ث", "ج", "س", "ح"][day - 1] : ["S", "M", "T", "W", "T", "F", "S"][day - 1]}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {isArabic ? "أطول سلسلة: 14 يوم" : "Best streak: 14 days"}
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🎯</span>
            {isArabic ? "تقدم الهدف" : "Goal Progress"}
          </h3>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(78 / 95) * 352} 352`}
                strokeLinecap="round"
                className="text-[#006C35]"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">78</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">/ 95</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isArabic ? "باقي 17 درجة للوصول للهدف" : "17 points to reach your goal"}
            </p>
            <p className="text-xs text-[#006C35] dark:text-[#4ade80] font-medium mt-1">
              {isArabic ? "82% من الهدف" : "82% of goal"}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">📅</span>
          {isArabic ? "مقارنة الأشهر" : "Monthly Comparison"}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { month: isArabic ? "نوفمبر" : "Nov", tests: 3, avgScore: 62 },
                { month: isArabic ? "ديسمبر" : "Dec", tests: 5, avgScore: 68 },
                { month: isArabic ? "يناير" : "Jan", tests: 7, avgScore: 72 },
                { month: isArabic ? "فبراير" : "Feb", tests: 6, avgScore: 78 },
              ]}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="tests"
                fill="#D4AF37"
                radius={[4, 4, 0, 0]}
                name={isArabic ? "عدد الاختبارات" : "Tests Count"}
              />
              <Bar
                yAxisId="right"
                dataKey="avgScore"
                fill="#006C35"
                radius={[4, 4, 0, 0]}
                name={isArabic ? "متوسط الدرجة" : "Avg Score"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accuracy Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">🎯</span>
          {isArabic ? "معدل الدقة عبر الوقت" : "Accuracy Trend Over Time"}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                { week: isArabic ? "الأسبوع ١" : "Week 1", accuracy: 65, questions: 40 },
                { week: isArabic ? "الأسبوع ٢" : "Week 2", accuracy: 68, questions: 55 },
                { week: isArabic ? "الأسبوع ٣" : "Week 3", accuracy: 72, questions: 48 },
                { week: isArabic ? "الأسبوع ٤" : "Week 4", accuracy: 70, questions: 62 },
                { week: isArabic ? "الأسبوع ٥" : "Week 5", accuracy: 75, questions: 70 },
                { week: isArabic ? "الأسبوع ٦" : "Week 6", accuracy: 78, questions: 65 },
              ]}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#8B5CF6"
                strokeWidth={3}
                fill="url(#colorAccuracy)"
                name={isArabic ? "الدقة" : "Accuracy"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600 dark:text-gray-400">{isArabic ? "معدل الدقة" : "Accuracy Rate"}</span>
          </div>
          <span className="text-purple-600 dark:text-purple-400 font-bold">
            {isArabic ? "+13% هذا الشهر" : "+13% this month"}
          </span>
        </div>
      </div>

      {/* Recommendations Based on Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">💡</span>
          {isArabic ? "توصيات بناءً على تقدمك" : "Recommendations Based on Your Progress"}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {isArabic ? "أداء ممتاز في الجبر!" : "Excellent performance in Algebra!"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? "استمر على نفس المستوى" : "Keep up the great work"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-600 dark:text-yellow-400">!</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {isArabic ? "ركز على استيعاب المقروء" : "Focus on Reading Comprehension"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? "جرب حل 10 أسئلة يومياً" : "Try solving 10 questions daily"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 dark:text-blue-400">📈</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {isArabic ? "زد وقت الدراسة قليلاً" : "Increase study time slightly"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? "30 دقيقة إضافية ستحدث فرقاً" : "30 extra minutes will make a difference"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
