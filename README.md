# Ring Automation Bridge 🔔

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Ring Client API](https://img.shields.io/badge/ring--client--api-v14.0.1-orange.svg)](https://github.com/dgreif/ring)

A Node.js bridge that connects Ring doorbell/camera events to any automation platform via webhooks. Get real-time notifications for doorbell presses, motion detection, and alarm mode changes sent to your webhook endpoint.

**✅ Works with any webhook-enabled automation platform:**

- n8n (tested and recommended)
- Home Assistant
- Zapier
- IFTTT
- Custom webhook endpoints
- Any HTTP endpoint that accepts JSON payloads

## 🌟 Features

- **Real-time Event Detection**

  - Doorbell button presses
  - Motion detection (multiple detection methods)
  - Ring Alarm mode changes
  - Active streaming events (dings)
  - Camera status updates

- **Robust Architecture**

  - Multiple event detection methods for reliability
  - Automatic event deduplication
  - Configurable polling intervals
  - Debug mode for troubleshooting
  - Modular codebase for easy maintenance

- **Flexible Configuration**
  - Filter events by type
  - Monitor specific Ring locations
  - Bearer token authentication for webhooks
  - Support for any webhook endpoint

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- A Ring account with devices
- A webhook endpoint (n8n, Home Assistant, Zapier, etc.)
- Ring refresh token (obtained during setup)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ring-automation-bridge.git
cd ring-automation-bridge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Authenticate with Ring

Generate your Ring refresh token:

```bash
npm run auth
```

Follow the prompts to:

1. Enter your Ring email and password
2. Complete 2FA verification
3. Copy the generated refresh token

### 4. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
RING_REFRESH_TOKEN=your_refresh_token_here
WEBHOOK_URL=https://your-automation-platform.com/webhook/ring-events

# Optional
RING_LOCATION_IDS=12345,67890  # Comma-separated location IDs (leave empty for all)
WEBHOOK_AUTH_HEADER=Bearer your_auth_token
DEBUG=false
POLLING_INTERVAL=10000  # milliseconds
EXCLUDED_EVENTS=camera_status_update,active_ding  # Events to exclude
```

### 5. Start the Bridge

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## 🔗 Platform Setup Guides

### n8n Setup

1. Create a new workflow in n8n
2. Add a "Webhook" trigger node
3. Copy the webhook URL to `WEBHOOK_URL` in your `.env`
4. Configure authentication if needed

### Home Assistant Setup

1. Go to Settings → Automations & Scenes → Automations
2. Create a new automation with a webhook trigger
3. Use the webhook URL in your `.env` file
4. Set up actions based on Ring events

### Zapier Setup

1. Create a new Zap with a "Webhooks by Zapier" trigger
2. Choose "Catch Hook" and copy the webhook URL
3. Configure your automation actions
4. Test with a Ring event

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Using Docker CLI

```bash
docker build -t ring-automation-bridge .
docker run -d \
  --name ring-automation-bridge \
  -e RING_REFRESH_TOKEN=your_refresh_token \
  -e WEBHOOK_URL=your_webhook_url \
  -e WEBHOOK_AUTH_HEADER="Bearer your_auth_token" \
  -e DEBUG=false \
  ring-automation-bridge
```

## 📡 Supported Event Types

The bridge supports the following Ring device events:

- `doorbell_pressed` - Doorbell button pressed
- `motion_detected` - Motion sensor triggered
- `active_ding` - Real-time streaming events
- `alarm_mode_changed` - Ring Alarm mode changes
- `camera_status_update` - Camera status updates
- `device_found` - Device discovery events
- `base_station_found` - Base station discovery
- `camera_found` - Camera discovery
- `alarm_mode_state` - Initial alarm state

## 📡 Event Payload Examples

### Doorbell Pressed

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventType": "doorbell_pressed",
  "source": "ring-doorbell",
  "data": {
    "cameraName": "Front Door",
    "cameraId": "12345",
    "locationName": "Home",
    "batteryLevel": 85,
    "dingId": "67890"
  }
}
```

### Motion Detected

```json
{
  "timestamp": "2024-01-15T10:31:00.000Z",
  "eventType": "motion_detected",
  "source": "ring-doorbell",
  "data": {
    "cameraName": "Front Door",
    "cameraId": "12345",
    "locationName": "Home",
    "detectionMethod": "onMotionDetected"
  }
}
```

### Alarm Mode Changed

```json
{
  "timestamp": "2024-01-15T10:32:00.000Z",
  "eventType": "alarm_mode_changed",
  "source": "ring-doorbell",
  "data": {
    "locationName": "Home",
    "alarmId": "98765",
    "mode": "away",
    "previousMode": "home"
  }
}
```

## 🔧 Configuration Options

| Environment Variable  | Required | Default       | Description                                       |
| --------------------- | -------- | ------------- | ------------------------------------------------- |
| `RING_REFRESH_TOKEN`  | Yes      | -             | Ring API refresh token                            |
| `WEBHOOK_URL`         | Yes      | -             | Webhook endpoint URL for your automation platform |
| `RING_LOCATION_IDS`   | No       | All locations | Comma-separated Ring location IDs                 |
| `WEBHOOK_AUTH_HEADER` | No       | -             | Bearer token for webhook authentication           |
| `DEBUG`               | No       | false         | Enable debug logging                              |
| `POLLING_INTERVAL`    | No       | 10000         | Event polling interval in milliseconds            |
| `EXCLUDED_EVENTS`     | No       | -             | Comma-separated list of events to exclude         |

## 🛠️ Development

### Project Structure

```bash
ring-automation-bridge/
├── src/
│   ├── index.js           # Main application entry point
│   ├── config/            # Configuration management
│   ├── clients/           # Ring API and webhook clients
│   ├── services/          # Event processing services
│   ├── handlers/          # Event handlers
│   └── utils/             # Shared utilities
├── package.json           # Dependencies and scripts
├── .env.example          # Environment template
├── Dockerfile            # Container image
├── docker-compose.yml    # Docker Compose config
└── run.sh               # Setup script
```

### Available Scripts

```bash
# Install dependencies
npm install

# Authenticate with Ring
npm run auth

# Start development server
npm run dev

# Start production server
npm start

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## 🔍 Troubleshooting

### Enable Debug Mode

Set `DEBUG=true` in your `.env` file to see detailed logs:

```env
DEBUG=true
```

### Common Issues

1. **Authentication Failed**

   - Regenerate your refresh token with `npm run auth`
   - Ensure 2FA is properly configured on your Ring account

2. **No Events Received**

   - Check if Ring devices are online in the Ring app
   - Verify location IDs are correct (if specified)
   - Enable debug mode to see raw event data
   - Test your webhook endpoint with a simple HTTP client

3. **Duplicate Events**

   - The bridge includes automatic deduplication
   - Adjust `POLLING_INTERVAL` if needed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ring-client-api](https://github.com/dgreif/ring) - The excellent Ring API client library
- [n8n](https://n8n.io) - The workflow automation platform (one of many supported)

## 🔗 Links

- [n8n Documentation](https://docs.n8n.io)
- [Ring API Documentation](https://github.com/dgreif/ring/wiki)
- [Report Issues](https://github.com/slavpilus/ring-automation-bridge/issues)

---

Made with ❤️ for the home automation community
