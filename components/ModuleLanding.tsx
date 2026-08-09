type Props = { eyebrow: string; title: string; description: string; items: { title: string; copy: string }[] };

export default function ModuleLanding({ eyebrow, title, description, items }: Props){
  return <>
    <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="card"><span className="chip">METTELO PLATFORM</span><h3 style={{marginTop:16}}>Built to become operational.</h3><p>This route is scaffolded now and will be connected to Supabase/CMS data in the next build phase.</p></div></div></section>
    <section className="section"><div className="shell"><div className="grid3">{items.map(item=><div className="card" key={item.title}><h3>{item.title}</h3><p>{item.copy}</p></div>)}</div></div></section>
  </>
}
