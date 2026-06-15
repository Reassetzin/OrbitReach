import styles from './HeroCard.module.css'
import clsx from 'clsx'

type Color = 'violet' | 'coral' | 'ocean' | 'forest'

interface Props {
  label: string
  value: string
  trend?: string
  sub?: string
  color: Color
  href?: string
}

export default function HeroCard({ label, value, trend, sub, color, href }: Props) {
  const Tag = href ? 'a' : 'div'
  return (
    <Tag href={href} className={clsx(styles.card, styles[color])}>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
      </div>
      <div>
        {trend && <span className={styles.trend}>{trend}</span>}
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
    </Tag>
  )
}
