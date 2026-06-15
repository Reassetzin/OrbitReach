import styles from './PageHeader.module.css'

interface Props {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.sub}>{subtitle}</p>}
      </div>
      {action && (
        action.href
          ? <a href={action.href} className="btn btn-violet">{action.label}</a>
          : <button onClick={action.onClick} className="btn btn-violet">{action.label}</button>
      )}
    </div>
  )
}
