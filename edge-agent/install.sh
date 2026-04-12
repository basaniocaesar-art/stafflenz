#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# StaffLenz Edge Agent — One-Command Installer
# Run on Raspberry Pi: curl -sL https://www.stafflenz.com/install.sh | bash
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════"
echo "  StaffLenz Edge Agent Installer"
echo "═══════════════════════════════════════════════"
echo ""

INSTALL_DIR="/opt/stafflenz-agent"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo bash install.sh"
  exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "[1/5] Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/5] Node.js already installed: $(node -v)"
fi

# Create install directory
echo "[2/5] Setting up agent directory..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Download agent files
echo "[3/5] Downloading agent..."
AGENT_URL="${STAFFLENZ_URL:-https://www.stafflenz.com}"

# Copy agent files (in production these would be downloaded)
cat > package.json << 'PKGEOF'
{
  "name": "stafflenz-edge-agent",
  "version": "1.0.0",
  "main": "agent.js",
  "scripts": { "start": "node agent.js", "setup": "node setup.js" },
  "dependencies": { "onvif": "^0.6.5" }
}
PKGEOF

# Download agent.js and setup.js from the server
if command -v curl &> /dev/null; then
  curl -sL "$AGENT_URL/api/agent/download?file=agent.js" -o agent.js 2>/dev/null || true
  curl -sL "$AGENT_URL/api/agent/download?file=setup.js" -o setup.js 2>/dev/null || true
fi

# If download failed, check if files exist locally
if [ ! -f agent.js ] || [ ! -s agent.js ]; then
  echo "Could not download agent files. Please copy agent.js and setup.js manually."
  exit 1
fi

# Install dependencies
echo "[4/5] Installing dependencies..."
npm install --production 2>/dev/null

# Run interactive setup if no config exists
if [ ! -f config.json ]; then
  echo ""
  echo "Running setup wizard..."
  node setup.js
fi

# Create systemd service for auto-start
echo "[5/5] Installing as system service..."
cat > /etc/systemd/system/stafflenz-agent.service << EOF
[Unit]
Description=StaffLenz Edge Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
Restart=always
RestartSec=30
User=root
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=stafflenz-agent

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable stafflenz-agent
systemctl start stafflenz-agent

echo ""
echo "═══════════════════════════════════════════════"
echo "  Installation complete!"
echo ""
echo "  Status:  sudo systemctl status stafflenz-agent"
echo "  Logs:    sudo journalctl -u stafflenz-agent -f"
echo "  Restart: sudo systemctl restart stafflenz-agent"
echo "  Stop:    sudo systemctl stop stafflenz-agent"
echo "  Config:  $INSTALL_DIR/config.json"
echo "═══════════════════════════════════════════════"
