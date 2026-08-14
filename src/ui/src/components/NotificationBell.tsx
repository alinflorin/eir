import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  CounterBadge,
  Divider,
  Link,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { Alert24Regular } from '@fluentui/react-icons'
import { useNotifications } from '../hooks/useNotifications'
import type { NotificationDto } from '../../../domain/notification-list-fetched'

const useStyles = makeStyles({
  trigger: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
  },
  surface: {
    display: 'flex',
    flexDirection: 'column',
    width: '360px',
    maxWidth: '90vw',
    padding: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingHorizontalM,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '360px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXXS,
    padding: tokens.spacingHorizontalM,
    textAlign: 'left',
    cursor: 'pointer',
    border: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    background: 'none',
    width: '100%',
  },
  unreadItem: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  itemTitle: {
    fontWeight: tokens.fontWeightSemibold,
  },
  itemBody: {
    color: tokens.colorNeutralForeground2,
  },
  itemDate: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  empty: {
    padding: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingHorizontalS,
  },
})

function NotificationBell() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, isLoading, hasMore, loadMore, markAsRead, markAllAsRead } = useNotifications()

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' })

  const handleItemClick = (notification: NotificationDto) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      window.open(notification.link, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Popover open={open} onOpenChange={(_e, data) => setOpen(data.open)} positioning="below-end">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={styles.trigger}
          appearance="transparent"
          shape="circular"
          icon={<Alert24Regular />}
          aria-label={t('notifications.bell.label', { count: unreadCount })}
        >
          {unreadCount > 0 && (
            <CounterBadge className={styles.badge} count={unreadCount} size="small" color="danger" overflowCount={99} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <div className={styles.header}>
          <Text weight="semibold">{t('notifications.title')}</Text>
          {unreadCount > 0 && <Link onClick={() => markAllAsRead()}>{t('notifications.markAllAsRead')}</Link>}
        </div>
        <Divider />
        <div className={styles.list}>
          {notifications.length === 0 && !isLoading && <Text className={styles.empty}>{t('notifications.empty')}</Text>}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`${styles.item} ${notification.isRead ? '' : styles.unreadItem}`}
              onClick={() => handleItemClick(notification)}
            >
              <Text className={styles.itemTitle}>{notification.title}</Text>
              <Text className={styles.itemBody}>{notification.body}</Text>
              <Text className={styles.itemDate}>{formatDate(notification.date)}</Text>
            </button>
          ))}
          {isLoading && (
            <div className={styles.footer}>
              <Spinner size="tiny" />
            </div>
          )}
          {!isLoading && hasMore && (
            <div className={styles.footer}>
              <Link onClick={() => loadMore()}>{t('notifications.loadMore')}</Link>
            </div>
          )}
        </div>
      </PopoverSurface>
    </Popover>
  )
}

export default NotificationBell
