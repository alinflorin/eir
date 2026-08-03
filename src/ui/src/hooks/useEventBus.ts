import { useCallback, useEffect, useState } from 'react'
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

let sharedClient: MqttClient | null = null
const clientListeners = new Set<(client: MqttClient | null) => void>()

function setSharedClient(client: MqttClient | null) {
  sharedClient = client
  clientListeners.forEach((listener) => listener(client))
}

export interface EventBus {
  connect: (accessToken: string, username: string) => void
  disconnect: () => void
  publish: (topic: string, message: string | Buffer) => void
  subscribe: (topic: string, onMessage: (topic: string, payload: Buffer) => void) => () => void
}

export function useEventBus(): EventBus {
  const [client, setClient] = useState<MqttClient | null>(sharedClient)

  useEffect(() => {
    clientListeners.add(setClient)
    return () => {
      clientListeners.delete(setClient)
    }
  }, [])

  const connect = useCallback((accessToken: string, username: string) => {
    sharedClient?.end(true)
    console.log(username);
    const mqttClient = mqtt.connect(BROKER_URL, {
      username,
      password: accessToken,
      protocolVersion: 5,
    })

    mqttClient.on('connect', () => setSharedClient(mqttClient))
  }, [])

  const disconnect = useCallback(() => {
    sharedClient?.end(true)
    setSharedClient(null)
  }, [])

  const publish = useCallback(
    (topic: string, message: string | Buffer) => {
      client?.publish(topic, message)
    },
    [client],
  )

  const subscribe = useCallback(
    (topic: string, onMessage: (topic: string, payload: Buffer) => void) => {
      if (!client) {
        return () => {}
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
    },
    [client],
  )

  return { connect, disconnect, publish, subscribe }
}
