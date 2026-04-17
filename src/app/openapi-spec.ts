// Sync mit docs/openapi.yaml halten — bei API-Änderungen beide Dateien aktualisieren
export const OPENAPI_YAML = `openapi: 3.1.0
info:
  title: iBinda API
  version: 1.0.0
  description: |
    Cloudflare Workers API für iBinda — anonymes Check-in-System.

    **Auth:** Alle Endpoints außer \`POST /api/auth/register-device\` erfordern einen gültigen API-Key,
    entweder als HttpOnly-Cookie (\`api_key_person\` / \`api_key_watcher\`) oder als Bearer-Token im
    \`Authorization\`-Header. Der Key wird bei der Geräte-Registrierung ausgestellt.

    **Rollen:** \`person\`-Keys und \`watcher\`-Keys sind getrennt. Watcher-Endpoints prüfen gegen
    \`watcher_devices\`, Person-Endpoints prüfen gegen \`person_devices\` (Ownership-Check).

servers:
  - url: https://ibinda.app
    description: Production

tags:
  - name: Auth
    description: Geräte-Registrierung und API-Key-Ausstellung
  - name: Person
    description: Person-Verwaltung und Heartbeat
  - name: Pairing
    description: QR-basiertes Pairing zwischen Person und Watcher
  - name: Device Link
    description: Gerätewechsel / Neues Gerät für bestehende Person hinzufügen
  - name: Watcher
    description: Watcher-Verwaltung und Personen-Monitoring
  - name: Watch Relation
    description: Verbindungs-Einstellungen zwischen Person und Watcher

components:
  securitySchemes:
    cookiePersonAuth:
      type: apiKey
      in: cookie
      name: api_key_person
    cookieWatcherAuth:
      type: apiKey
      in: cookie
      name: api_key_watcher
    bearerAuth:
      type: http
      scheme: bearer

  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: string

    PersonRow:
      type: object
      properties:
        id:
          type: string
          format: uuid
        last_heartbeat:
          type: string
          format: date-time
          nullable: true
        created_at:
          type: string
          format: date-time
          nullable: true
        deleted_at:
          type: string
          format: date-time
          nullable: true
        max_devices:
          type: integer
          default: 1

    PersonDeviceRow:
      type: object
      properties:
        id:
          type: integer
        person_id:
          type: string
          format: uuid
        device_id:
          type: string
        device_model:
          type: string
        last_seen:
          type: string
          format: date-time

    WatcherPersonStatus:
      type: object
      properties:
        id:
          type: string
          format: uuid
        last_heartbeat:
          type: string
          format: date-time
          nullable: true
        check_interval_minutes:
          type: integer
        status:
          type: string
          enum: [ok, overdue, never, deleted]
        deleted:
          type: integer
          enum: [0, 1]

    PairingStatus:
      type: string
      enum: [pending, requested, completed, expired, rejected]

    DeviceLinkStatus:
      type: string
      enum: [pending, requested, completed, expired, rejected]

    DeviceAction:
      type: string
      enum: [switch, add, full]

paths:

  /api/auth/register-device:
    post:
      tags: [Auth]
      summary: Gerät registrieren und API-Key erhalten
      description: |
        Registriert ein neues Gerät und gibt einen API-Key als HttpOnly-Cookie zurück.
        Erneutes Aufrufen mit gültigem API-Key rotiert den Key für das eigene Gerät.
        Eine fremde \`device_id\` ohne passenden Key wird mit \`409\` abgewiesen.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [device_id]
              properties:
                device_id:
                  type: string
                  maxLength: 255
                  description: Geräte-ID (UUID empfohlen)
                role:
                  type: string
                  enum: [person, watcher]
                  default: person
      responses:
        '201':
          description: Gerät registriert. Cookie gesetzt.
          content:
            application/json:
              schema:
                type: object
                properties:
                  registered:
                    type: boolean
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person:
    post:
      tags: [Person]
      summary: Person anlegen oder übernehmen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                  format: uuid
                  description: Optional — wenn weggelassen wird eine neue UUID erzeugt
      responses:
        '201':
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}:
    get:
      tags: [Person]
      summary: Person-Details abrufen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonRow'
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      tags: [Person]
      summary: Person soft-löschen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/heartbeat:
    post:
      tags: [Person]
      summary: Heartbeat senden
      description: Registriert einen Check-in. Rate-Limit 1x/Stunde pro Gerät.
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [person_id]
              properties:
                person_id:
                  type: string
                  format: uuid
                status:
                  type: string
                  maxLength: 64
                  default: ok
                push_token:
                  type: string
                  nullable: true
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
                    nullable: true
                  status:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                  retry_after_seconds:
                    type: integer

  /api/person/{id}/has-watcher:
    get:
      tags: [Person]
      summary: Prüfen ob Person mindestens einen aktiven Watcher hat
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  has_watcher:
                    type: boolean
                  watcher_count:
                    type: integer
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}/watchers:
    get:
      tags: [Person]
      summary: Verbundene Watcher und offene Disconnect-Events abrufen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  watcher_count:
                    type: integer
                  watchers:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                  disconnect_events:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: integer
                        watcher_id:
                          type: string
                          format: uuid
                        created_at:
                          type: string
                          format: date-time
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}/disconnect-events/ack:
    post:
      tags: [Person]
      summary: Disconnect-Events als gesehen markieren
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [event_ids]
              properties:
                event_ids:
                  type: array
                  items:
                    type: integer
                  minItems: 1
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  acknowledged_count:
                    type: integer
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}/devices:
    get:
      tags: [Person]
      summary: Geräteliste einer Person abrufen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  devices:
                    type: array
                    items:
                      $ref: '#/components/schemas/PersonDeviceRow'
                  max_devices:
                    type: integer
                  device_count:
                    type: integer
                  device_action:
                    $ref: '#/components/schemas/DeviceAction'
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    post:
      tags: [Person]
      summary: Gerät zu Person hinzufügen oder wechseln
      description: |
        Bindet ein weiteres Gerät (\`mode=add\`) oder ersetzt alle bisherigen (\`mode=switch\`).
        Watcher-Geräte können nicht als Person-Gerät hinzugefügt werden.
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [device_id]
              properties:
                device_id:
                  type: string
                  maxLength: 255
                mode:
                  type: string
                  enum: [switch, add]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
                  device_model:
                    type: string
                  last_seen:
                    type: string
                    format: date-time
                  max_devices:
                    type: integer
                  device_action:
                    $ref: '#/components/schemas/DeviceAction'
                  removed_device_ids:
                    type: array
                    items:
                      type: string
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      tags: [Person]
      summary: Gerät von Person entfernen
      description: Das letzte verbleibende Gerät kann nicht entfernt werden.
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [device_id]
              properties:
                device_id:
                  type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}/device-link/create:
    post:
      tags: [Device Link]
      summary: Gerätewechsel-Token erstellen (QR erzeugen)
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [mode]
              properties:
                mode:
                  type: string
                  enum: [switch, add]
      responses:
        '201':
          content:
            application/json:
              schema:
                type: object
                properties:
                  link_token:
                    type: string
                    format: uuid
                  mode:
                    type: string
                    enum: [switch, add]
                  expires_in_seconds:
                    type: integer
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/device-link/{token}:
    get:
      tags: [Device Link]
      summary: Status eines Gerätewechsel-Tokens abrufen
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  link_token:
                    type: string
                    format: uuid
                  person_id:
                    type: string
                    format: uuid
                  mode:
                    type: string
                    enum: [switch, add]
                  status:
                    $ref: '#/components/schemas/DeviceLinkStatus'
                  requested_device_id:
                    type: string
                    nullable: true
                  requested_device_model:
                    type: string
                    nullable: true
                  requested_at:
                    type: string
                    format: date-time
                    nullable: true
                  completed_at:
                    type: string
                    format: date-time
                    nullable: true
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/device-link/claim:
    post:
      tags: [Device Link]
      summary: Gerätewechsel-Token einlösen (neues Gerät scannt QR)
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [link_token]
              properties:
                link_token:
                  type: string
                  format: uuid
      responses:
        '200':
          description: mode=add — Gerät sofort hinzugefügt
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
                  device_action:
                    type: string
                    enum: [add]
                  max_devices:
                    type: integer
                  removed_device_ids:
                    type: array
                    items:
                      type: string
        '202':
          description: mode=switch — Anfrage gestellt, wartet auf Bestätigung
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
                  device_action:
                    type: string
                    enum: [switch]
                  status:
                    type: string
                    enum: [requested]
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '410':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/person/{id}/device-link/confirm:
    post:
      tags: [Device Link]
      summary: Gerätewechsel bestätigen oder ablehnen (altes Gerät)
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [link_token, action]
              properties:
                link_token:
                  type: string
                  format: uuid
                action:
                  type: string
                  enum: [approve, reject]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  device_id:
                    type: string
                    nullable: true
                  device_action:
                    type: string
                    enum: [switch, add]
                  max_devices:
                    type: integer
                    nullable: true
                  removed_device_ids:
                    type: array
                    items:
                      type: string
                  status:
                    type: string
                    enum: [completed, rejected]
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '410':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/pair/create:
    post:
      tags: [Pairing]
      summary: Pairing-Token erstellen (Person erzeugt QR)
      description: TTL 5 Minuten. Offene Tokens derselben Person werden automatisch expired.
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [person_id]
              properties:
                person_id:
                  type: string
                  format: uuid
      responses:
        '201':
          content:
            application/json:
              schema:
                type: object
                properties:
                  pairing_token:
                    type: string
                    format: uuid
                  expires_in_seconds:
                    type: integer
                    example: 300
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/pair/{token}:
    get:
      tags: [Pairing]
      summary: Pairing-Status abfragen (Polling)
      description: Zugang für die Person (Ownership) oder das anfragende Watcher-Gerät.
      security:
        - cookiePersonAuth: []
        - cookieWatcherAuth: []
        - bearerAuth: []
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    $ref: '#/components/schemas/PairingStatus'
                  watcher_name:
                    type: string
                    nullable: true
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/pair/respond:
    post:
      tags: [Pairing]
      summary: Pairing-Anfrage stellen (Watcher scannt QR)
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [pairing_token, watcher_name]
              properties:
                pairing_token:
                  type: string
                  format: uuid
                watcher_name:
                  type: string
                  minLength: 2
                  maxLength: 35
                  description: Die ersten 2 Zeichen müssen Buchstaben sein
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  status:
                    type: string
                    enum: [requested]
                  person_id:
                    type: string
                    format: uuid
                  watcher_id:
                    type: string
                    format: uuid
                  watcher_name:
                    type: string
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '410':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/pair/confirm:
    post:
      tags: [Pairing]
      summary: Pairing annehmen oder ablehnen (Person bestätigt)
      security:
        - cookiePersonAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [pairing_token, action]
              properties:
                pairing_token:
                  type: string
                  format: uuid
                action:
                  type: string
                  enum: [approve, reject]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  status:
                    type: string
                    enum: [completed, rejected]
                  person_id:
                    type: string
                    format: uuid
                    nullable: true
                  watcher_id:
                    type: string
                    format: uuid
                    nullable: true
                  watcher_name:
                    type: string
                    nullable: true
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '410':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/watcher:
    post:
      tags: [Watcher]
      summary: Neuen Watcher anlegen
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                push_token:
                  type: string
                  description: FCM/APNs Push-Token
      responses:
        '201':
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid

  /api/watcher/{id}:
    get:
      tags: [Watcher]
      summary: Watcher-Details abrufen
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  max_persons:
                    type: integer
                  created_at:
                    type: string
                    format: date-time
                    nullable: true
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      tags: [Watcher]
      summary: Watcher löschen
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/watcher/{id}/persons:
    get:
      tags: [Watcher]
      summary: Überwachte Personen mit Status abrufen
      description: |
        Status-Logik: \`ok\` wenn Heartbeat innerhalb des Intervalls, \`overdue\` wenn überfällig,
        \`never\` wenn noch kein Heartbeat, \`deleted\` wenn Person soft-gelöscht.
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/WatcherPersonStatus'
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/watch:
    post:
      tags: [Watch Relation]
      summary: Direktes Verbinden (deaktiviert)
      description: Deaktiviert — bitte den QR-Pairing-Flow verwenden.
      security: []
      responses:
        '410':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    put:
      tags: [Watch Relation]
      summary: Check-Intervall einer Verbindung aktualisieren
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [person_id, watcher_id, check_interval_minutes]
              properties:
                person_id:
                  type: string
                  format: uuid
                watcher_id:
                  type: string
                  format: uuid
                check_interval_minutes:
                  type: integer
                  minimum: 1
                  maximum: 10080
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  person_id:
                    type: string
                    format: uuid
                  watcher_id:
                    type: string
                    format: uuid
                  check_interval_minutes:
                    type: integer
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      tags: [Watch Relation]
      summary: Verbindung trennen
      security:
        - cookieWatcherAuth: []
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [person_id, watcher_id]
              properties:
                person_id:
                  type: string
                  format: uuid
                watcher_id:
                  type: string
                  format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
`;
