FROM clamav/clamav:stable

# The API reaches clamd over Fly private networking (IPv6); Fly health checks probe IPv4. Uploads are capped at 25 MB.
# Concurrent reload keeps the old database in RAM while loading the new one and OOM-killed clamd on a 2 GB machine.
RUN sed -i \
  -e '/^TCPAddr/d' \
  -e '/^StreamMaxLength/d' \
  -e '/^ConcurrentDatabaseReload/d' \
  /etc/clamav/clamd.conf \
  && printf 'TCPAddr ::\nTCPAddr 0.0.0.0\nStreamMaxLength 30M\nConcurrentDatabaseReload no\n' >> /etc/clamav/clamd.conf
