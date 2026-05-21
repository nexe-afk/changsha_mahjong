#!/bin/bash
set -e

PROJECT_ID=${1:-"changsha-mahjong"}
INSTANCE_NAME="mahjong-server"
ZONE="asia-east1-a"
MACHINE_TYPE="e2-micro"
IMAGE="ubuntu-2204-jammy-v20240501"

echo "=== Creating GCE instance ==="
gcloud compute instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu'

echo "=== Waiting for instance to be ready ==="
sleep 30

echo "=== Getting external IP ==="
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
  --zone=$ZONE \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "Server IP: $EXTERNAL_IP"

echo "=== Copying project files ==="
gcloud compute scp --zone=$ZONE --recurse \
  ../server ../shared ../docker-compose.yml ../server/Dockerfile \
  $INSTANCE_NAME:~/mahjong/

echo "=== Deploying with Docker ==="
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
cd ~/mahjong
docker compose up -d --build
"

echo "=== Done! ==="
echo "Server running at: http://$EXTERNAL_IP:3000"
echo "Update client/lib/config/constants.dart with this IP"
