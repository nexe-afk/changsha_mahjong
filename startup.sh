#!/bin/bash
set -ex

export DEBIAN_FRONTEND=noninteractive

echo "=== STARTUP BEGIN ===" | tee /dev/ttyS0

apt-get update -y
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "=== Docker installed ===" | tee /dev/ttyS0

cd /opt
rm -rf mahjong
git clone https://github.com/518aa/changsha-mahjong.git mahjong
cd mahjong

echo "=== Starting docker compose ===" | tee /dev/ttyS0
docker compose up -d --build 2>&1 | tee /dev/ttyS0

echo "=== Build complete, waiting for containers ===" | tee /dev/ttyS0
sleep 15

echo "=== Docker compose ps ===" | tee /dev/ttyS0
docker compose ps -a 2>&1 | tee /dev/ttyS0

echo "=== Waiting for server to be healthy ===" | tee /dev/ttyS0
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null | grep -q "200"; then
    echo "=== Server is healthy! ===" | tee /dev/ttyS0
    break
  fi
  echo "Attempt $i/30: Server not ready yet..." | tee /dev/ttyS0
  docker compose logs server --tail 5 2>&1 | tee /dev/ttyS0
  sleep 10
done

echo "=== Docker compose ps ===" | tee /dev/ttyS0
docker compose ps -a 2>&1 | tee /dev/ttyS0

echo "=== Server container logs ===" | tee /dev/ttyS0
docker compose logs server --tail 100 2>&1 | tee /dev/ttyS0

echo "=== DEPLOY COMPLETE ===" | tee /dev/ttyS0
