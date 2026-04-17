"use client";

interface DiagramData {
  radius?: number;
  diameter?: number;
  side?: number;
  perimeter?: number;
  area?: number;
  length?: number;
  width?: number;
  base?: number;
  height?: number;
  sides?: number[] | number;
  angle1?: number;
  type?: string;
}

interface GeometryDiagramProps {
  diagramType: string;
  diagramData: DiagramData;
}

export default function GeometryDiagram({ diagramType, diagramData }: GeometryDiagramProps) {
  const svgSize = 200;
  const center = svgSize / 2;
  const scale = 15; // Scale factor for measurements

  // Common styles
  const shapeStyle = "fill-[#006C35]/10 stroke-[#006C35] stroke-2";
  const labelStyle = "fill-gray-700 dark:fill-gray-300 text-sm font-medium";
  const measureStyle = "fill-[#D4AF37] text-xs font-bold";
  const angleStyle = "fill-none stroke-[#D4AF37] stroke-2";

  const renderCircle = () => {
    const r = (diagramData.radius || (diagramData.diameter ? diagramData.diameter / 2 : 4)) * scale;
    const displayRadius = diagramData.radius || (diagramData.diameter ? diagramData.diameter / 2 : null);
    const displayDiameter = diagramData.diameter;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Circle */}
        <circle cx={center} cy={center} r={Math.min(r, 70)} className={shapeStyle} />

        {/* Center point */}
        <circle cx={center} cy={center} r={3} className="fill-[#006C35]" />

        {/* Radius line */}
        <line
          x1={center}
          y1={center}
          x2={center + Math.min(r, 70)}
          y2={center}
          className="stroke-[#D4AF37] stroke-2 stroke-dashed"
        />

        {/* Radius label */}
        {displayRadius && (
          <text x={center + Math.min(r, 70) / 2} y={center - 8} textAnchor="middle" className={measureStyle}>
            نق = {displayRadius}
          </text>
        )}

        {/* Diameter line (if diameter is given) */}
        {displayDiameter && (
          <>
            <line
              x1={center - Math.min(r, 70)}
              y1={center}
              x2={center + Math.min(r, 70)}
              y2={center}
              className="stroke-[#D4AF37] stroke-2"
            />
            <text x={center} y={center + Math.min(r, 70) + 20} textAnchor="middle" className={measureStyle}>
              ق = {displayDiameter}
            </text>
          </>
        )}

        {/* Labels */}
        <text x={center} y={20} textAnchor="middle" className={labelStyle}>دائرة</text>
      </svg>
    );
  };

  const renderSquare = () => {
    const side = diagramData.side || (diagramData.area ? Math.sqrt(diagramData.area) : (diagramData.perimeter ? diagramData.perimeter / 4 : 5));
    const size = Math.min(side * scale, 120);
    const startX = center - size / 2;
    const startY = center - size / 2;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Square */}
        <rect x={startX} y={startY} width={size} height={size} className={shapeStyle} />

        {/* Right angle markers */}
        <path d={`M ${startX + 10} ${startY} L ${startX + 10} ${startY + 10} L ${startX} ${startY + 10}`} className={angleStyle} />

        {/* Side measurement */}
        <text x={center} y={startY - 10} textAnchor="middle" className={measureStyle}>
          {diagramData.side || side}
        </text>

        {/* Side label on right */}
        <text x={startX + size + 15} y={center} textAnchor="start" className={measureStyle}>
          {diagramData.side || side}
        </text>

        {/* Label */}
        <text x={center} y={svgSize - 10} textAnchor="middle" className={labelStyle}>مربع</text>
      </svg>
    );
  };

  const renderRectangle = () => {
    const length = diagramData.length || 8;
    const width = diagramData.width || 4;
    const scaleL = Math.min(length * 10, 140);
    const scaleW = Math.min(width * 10, 80);
    const startX = center - scaleL / 2;
    const startY = center - scaleW / 2;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Rectangle */}
        <rect x={startX} y={startY} width={scaleL} height={scaleW} className={shapeStyle} />

        {/* Right angle marker */}
        <path d={`M ${startX + 10} ${startY} L ${startX + 10} ${startY + 10} L ${startX} ${startY + 10}`} className={angleStyle} />

        {/* Length measurement (top) */}
        <text x={center} y={startY - 10} textAnchor="middle" className={measureStyle}>
          {length}
        </text>

        {/* Width measurement (right side) */}
        <text x={startX + scaleL + 15} y={center} textAnchor="start" className={measureStyle}>
          {width}
        </text>

        {/* Label */}
        <text x={center} y={svgSize - 10} textAnchor="middle" className={labelStyle}>مستطيل</text>
      </svg>
    );
  };

  const renderTriangle = () => {
    const base = diagramData.base || 6;
    const height = diagramData.height || 4;
    const scaleB = Math.min(base * 12, 140);
    const scaleH = Math.min(height * 12, 100);

    const x1 = center - scaleB / 2; // Left point
    const y1 = center + scaleH / 2; // Bottom
    const x2 = center + scaleB / 2; // Right point
    const y2 = center + scaleH / 2; // Bottom
    const x3 = center; // Top point
    const y3 = center - scaleH / 2; // Top

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Triangle */}
        <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} className={shapeStyle} />

        {/* Height line (dashed) */}
        <line x1={x3} y1={y3} x2={x3} y2={y1} className="stroke-[#D4AF37] stroke-2 stroke-dashed" />

        {/* Height label */}
        <text x={x3 + 15} y={center} textAnchor="start" className={measureStyle}>
          ع = {height}
        </text>

        {/* Base measurement */}
        <text x={center} y={y1 + 20} textAnchor="middle" className={measureStyle}>
          ق = {base}
        </text>

        {/* Right angle marker at base */}
        <rect x={x3 - 5} y={y1 - 10} width={10} height={10} className="fill-none stroke-[#D4AF37] stroke-1" />

        {/* Label */}
        <text x={center} y={20} textAnchor="middle" className={labelStyle}>مثلث</text>
      </svg>
    );
  };

  const renderRightTriangle = () => {
    const base = diagramData.base || 3;
    const height = diagramData.height || 4;
    const hypotenuse = Math.sqrt(base * base + height * height);
    const scaleB = Math.min(base * 15, 120);
    const scaleH = Math.min(height * 15, 100);

    const x1 = center - scaleB / 2; // Left bottom (right angle)
    const y1 = center + scaleH / 2;
    const x2 = center + scaleB / 2; // Right bottom
    const y2 = center + scaleH / 2;
    const x3 = center - scaleB / 2; // Top left
    const y3 = center - scaleH / 2;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Triangle */}
        <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} className={shapeStyle} />

        {/* Right angle marker */}
        <path d={`M ${x1 + 12} ${y1} L ${x1 + 12} ${y1 - 12} L ${x1} ${y1 - 12}`} className={angleStyle} />

        {/* Base measurement */}
        <text x={(x1 + x2) / 2} y={y1 + 20} textAnchor="middle" className={measureStyle}>
          {base}
        </text>

        {/* Height measurement */}
        <text x={x1 - 15} y={center} textAnchor="end" className={measureStyle}>
          {height}
        </text>

        {/* Hypotenuse with question mark */}
        <text x={(x2 + x3) / 2 + 15} y={(y2 + y3) / 2} textAnchor="start" className="fill-red-500 text-sm font-bold">
          ؟ = {hypotenuse.toFixed(0)}
        </text>

        {/* Label */}
        <text x={center} y={20} textAnchor="middle" className={labelStyle}>مثلث قائم</text>
      </svg>
    );
  };

  const renderAngles = () => {
    const angle1 = diagramData.angle1 || 70;
    const isComplementary = diagramData.type === "complementary" || angle1 <= 90;
    const totalAngle = isComplementary ? 90 : 180;
    const angle2 = totalAngle - angle1;

    const radius = 60;
    const angle1Rad = (angle1 * Math.PI) / 180;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* Base line */}
        <line x1={30} y1={center + 30} x2={svgSize - 30} y2={center + 30} className="stroke-[#006C35] stroke-2" />

        {/* First angle line */}
        <line
          x1={center}
          y1={center + 30}
          x2={center + radius * Math.cos(-angle1Rad)}
          y2={center + 30 + radius * Math.sin(-angle1Rad)}
          className="stroke-[#006C35] stroke-2"
        />

        {/* Angle arc for first angle */}
        <path
          d={`M ${center + 30} ${center + 30} A 30 30 0 0 0 ${center + 30 * Math.cos(-angle1Rad)} ${center + 30 + 30 * Math.sin(-angle1Rad)}`}
          className="fill-none stroke-[#D4AF37] stroke-2"
        />

        {/* Angle labels */}
        <text x={center + 45} y={center + 15} className={measureStyle}>{angle1}°</text>

        {/* Second angle indicator */}
        {totalAngle === 180 && (
          <text x={center - 40} y={center + 15} className="fill-red-500 text-sm font-bold">؟°</text>
        )}

        {/* Label */}
        <text x={center} y={svgSize - 10} textAnchor="middle" className={labelStyle}>
          {totalAngle === 90 ? "زاويتان متتامتان" : "زاويتان متكاملتان"}
        </text>
      </svg>
    );
  };

  const renderVerticalAngles = () => {
    const angle1 = diagramData.angle1 || 50;

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
        {/* First line */}
        <line x1={30} y1={30} x2={svgSize - 30} y2={svgSize - 30} className="stroke-[#006C35] stroke-2" />

        {/* Second line */}
        <line x1={30} y1={svgSize - 30} x2={svgSize - 30} y2={30} className="stroke-[#006C35] stroke-2" />

        {/* Center point */}
        <circle cx={center} cy={center} r={4} className="fill-[#006C35]" />

        {/* Angle arcs */}
        <path d={`M ${center + 25} ${center} A 25 25 0 0 1 ${center} ${center - 25}`} className="fill-[#D4AF37]/30 stroke-[#D4AF37] stroke-2" />
        <path d={`M ${center - 25} ${center} A 25 25 0 0 1 ${center} ${center + 25}`} className="fill-[#D4AF37]/30 stroke-[#D4AF37] stroke-2" />

        {/* Angle labels */}
        <text x={center + 35} y={center - 25} className={measureStyle}>{angle1}°</text>
        <text x={center - 50} y={center + 35} className="fill-red-500 text-sm font-bold">؟°</text>

        {/* Label */}
        <text x={center} y={svgSize - 5} textAnchor="middle" className={labelStyle}>زاويتان متقابلتان بالرأس</text>
      </svg>
    );
  };

  const renderPolygon = () => {
    const sidesData = diagramData.sides;
    const sidesCount = typeof sidesData === 'number' ? sidesData : (Array.isArray(sidesData) ? sidesData.length : 4);
    const size = 60;

    // For quadrilateral (4 sides)
    if (sidesCount === 4) {
      const startX = center - size;
      const startY = center - size / 1.5;
      const width = size * 2;
      const height = size * 1.3;

      return (
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
          {/* Quadrilateral */}
          <polygon
            points={`${startX},${startY} ${startX + width},${startY} ${startX + width},${startY + height} ${startX},${startY + height}`}
            className={shapeStyle}
          />

          {/* Angle arcs */}
          <path d={`M ${startX + 15} ${startY} L ${startX + 15} ${startY + 15} L ${startX} ${startY + 15}`} className={angleStyle} />
          <path d={`M ${startX + width - 15} ${startY} L ${startX + width - 15} ${startY + 15} L ${startX + width} ${startY + 15}`} className={angleStyle} />
          <path d={`M ${startX + width - 15} ${startY + height} L ${startX + width - 15} ${startY + height - 15} L ${startX + width} ${startY + height - 15}`} className={angleStyle} />
          <path d={`M ${startX + 15} ${startY + height} L ${startX + 15} ${startY + height - 15} L ${startX} ${startY + height - 15}`} className={angleStyle} />

          {/* Angle labels */}
          <text x={startX + 25} y={startY + 25} className={measureStyle}>90°</text>
          <text x={startX + width - 35} y={startY + 25} className={measureStyle}>90°</text>
          <text x={startX + width - 35} y={startY + height - 15} className={measureStyle}>90°</text>
          <text x={startX + 25} y={startY + height - 15} className={measureStyle}>90°</text>

          {/* Sum label */}
          <text x={center} y={center} textAnchor="middle" className="fill-[#006C35] dark:fill-[#4ade80] text-lg font-bold">
            360°
          </text>

          {/* Label */}
          <text x={center} y={svgSize - 10} textAnchor="middle" className={labelStyle}>شكل رباعي</text>
        </svg>
      );
    }

    return null;
  };

  const renderDiagram = () => {
    switch (diagramType) {
      case "circle":
        return renderCircle();
      case "square":
        return renderSquare();
      case "rectangle":
        return renderRectangle();
      case "triangle":
        return renderTriangle();
      case "right_triangle":
        return renderRightTriangle();
      case "angles":
        return renderAngles();
      case "vertical_angles":
        return renderVerticalAngles();
      case "polygon":
        return renderPolygon();
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-600">
      {renderDiagram()}
    </div>
  );
}
