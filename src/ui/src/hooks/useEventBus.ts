import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import mqtt, { type MqttClient } from 'mqtt'

const { protocol, hostname } = window.location
const baseDomain = hostname.split('.').slice(1).join('.') || hostname
const wsProtocol = protocol === 'https:' ? 'wss' : 'ws'
const BROKER_URL = `${wsProtocol}://rabbitmq.${baseDomain}/ws`

function topicMatches(filter: string, topic: string): boolean {
  const filterLevels = filter.split('/')
  const topicLevels = topic.split('/')

  for (let i = 0; i < filterLevels.length; i++) {
    if (filterLevels[i] === '#') {
      return true
    }
    if (filterLevels[i] !== '+' && filterLevels[i] !== topicLevels[i]) {
      return false
    }
  }

  return filterLevels.length === topicLevels.length
}

export function useEventBus(topic?: string, onMessage?: (topic: string, payload: Buffer) => void): MqttClient | null {
  const { isAuthenticated, user } = useAuth()
  const [client, setClient] = useState<MqttClient | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.access_token) {
      return
    }

    const mqttClient = mqtt.connect(BROKER_URL, {
      username: user.profile.sub,
      password: user.access_token,
      protocolVersion: 5,
    })

    mqttClient.on('connect', () => setClient(mqttClient))

    return () => {
      mqttClient.end(true)
      setClient(null)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!client || !topic || !onMessage) {
      return
    }

    const handleMessage = (receivedTopic: string, payload: Buffer) => {
      if (topicMatches(topic, receivedTopic)) {
        onMessage(receivedTopic, payload)
      }
    }

    client.subscribe(topic)
    client.on('message', handleMessage)

    return () => {
      client.unsubscribe(topic)
      client.off('message', handleMessage)
    }
  }, [client, topic, onMessage])

  return client
}
