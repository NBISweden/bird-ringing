FROM debian:trixie-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-core \
    libreoffice-common \
    python3-venv \
    python3-pip \
    python3-uno \
    fonts-dejavu-core \
    fonts-liberation \
    tini \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd --create-home --home-dir /home/app --shell /usr/sbin/nologin appuser

# App venv: must see system site-packages so `import uno` works
RUN python3 -m venv --system-site-packages /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]"

WORKDIR /app
COPY server.py /app/server.py
COPY entrypoint.sh /app/entrypoint.sh

# Ensure the non-root user can execute entrypoint and write temp/profile dirs
RUN chmod +x /app/entrypoint.sh \
    && chown -R appuser:appuser /app /home/app

# Make a dedicated tmp owned by appuser
RUN mkdir -p /tmp/lo-profile /tmp/lo-tmp \
    && chown -R appuser:appuser /tmp/lo-profile /tmp/lo-tmp

ENTRYPOINT ["/usr/bin/tini", "--"]

USER appuser
CMD ["/app/entrypoint.sh"]