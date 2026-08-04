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
let sharedUsername: string | null = null
const clientListeners = new Set<(client: MqttClient | null) => void>()
const usernameListeners = new Set<(username: string | null) => void>()

function setSharedClient(client: MqttClient | null) {
  sharedClient = client
  clientListeners.forEach((listener) => listener(client))
}

function setSharedUsername(username: string | null) {
  sharedUsername = username
  usernameListeners.forEach((listener) => listener(username))
}

export interface EventBus {
  connect: (accessToken: string, username: string) => void
  disconnect: () => void
  publish: <T extends object>(payload: T) => void
  subscribe: <T extends object>(type: new (...args: never[]) => T, onMessage: (payload: T) => void) => () => void
}

export function useEventBus(): EventBus {
  const [client, setClient] = useState<MqttClient | null>(sharedClient)
  const [username, setUsername] = useState<string | null>(sharedUsername)

  useEffect(() => {
    clientListeners.add(setClient)
    usernameListeners.add(setUsername)
    return () => {
      clientListeners.delete(setClient)
      usernameListeners.delete(setUsername)
    }
  }, [])

  const connect = useCallback((accessToken: string, username: string) => {
    sharedClient?.end(true)
    const mqttClient = mqtt.connect(BROKER_URL, {
      username,
      password: accessToken,
      protocolVersion: 5,
      clientId: username,
    })

    mqttClient.on('connect', () => {
      setSharedClient(mqttClient)
      setSharedUsername(username)
    })
  }, [])

  const disconnect = useCallback(() => {
    sharedClient?.end(true)
    setSharedClient(null)
    setSharedUsername(null)
  }, [])

  const publish = useCallback(
    <T extends object>(payload: T) => {
      if (!username) {
        console.warn('Cannot publish: no authenticated user')
        return
      }
      const topic = `${username}/${payload.constructor.name}`
      client?.publish(topic, JSON.stringify(payload))
    },
    [client, username],
  )

  const subscribe = useCallback(
    <T extends object>(type: new (...args: never[]) => T, onMessage: (payload: T) => void) => {
      if (!client || !username) {
        return () => {}
      }

      const topic = `${username}/${type.name}`

      const handleMessage = (receivedTopic: string, payload: Buffer) => {
        if (topicMatches(topic, receivedTopic)) {
          onMessage(JSON.parse(payload.toString()) as T)
        }
      }

      client.subscribe(topic)
      client.on('message', handleMessage)

      return () => {
        client.unsubscribe(topic)
        client.off('message', handleMessage)
      }
    },
    [client, username],
  )

  return { connect, disconnect, publish, subscribe }
}
