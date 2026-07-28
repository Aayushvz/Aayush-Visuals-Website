/*
  The right-hand properties panel: X/Y/W/H, a fill swatch (the project's own
  cover image, the way Figma previews an image fill), and an export row.
  Purely decorative chrome — it reports the "artboard" this page renders as.
*/
type Props = {
  name: string;
  width: number;
  height: number;
  fillImage: string;
};

export default function FigmaPropertiesPanel({ name, width, height, fillImage }: Props) {
  const rows: [string, number][] = [
    ["X", 0],
    ["Y", 0],
    ["W", width],
    ["H", height],
  ];

  return (
    <aside className="figp-props" aria-label="Properties">
      <div className="figp-phead">
        <span className="figp-ptab">Design</span>
        <span className="figp-pzoom">100%</span>
      </div>
      <p className="figp-pselected">{name}</p>
      <div className="figp-pgrid">
        {rows.map(([k, v]) => (
          <div className="figp-pcell" key={k}>
            <span className="figp-pk">{k}</span>
            <span className="figp-pv">{v}</span>
          </div>
        ))}
      </div>
      <div className="figp-psec">
        <p className="figp-plabel">Fill</p>
        <div className="figp-pfill">
          <span className="figp-pswatch" style={{ backgroundImage: `url(${fillImage})` }} />
          <span className="figp-pv">Image</span>
          <span className="figp-pk">Fill</span>
        </div>
      </div>
      <div className="figp-psec">
        <p className="figp-plabel">Export</p>
        <p className="figp-pexport">
          <span className="figp-pk">+</span> PNG 2x
        </p>
      </div>
    </aside>
  );
}
