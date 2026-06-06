FROM dart:stable

ENV PATH="/root/.pub-cache/bin:${PATH}"
ENV PORT=8080
ENV FFAI_WORKSPACE=/workspace/custom_code_connect

RUN dart pub global activate flutterflow_cli 0.0.37

WORKDIR /app
COPY pubspec.yaml ./
RUN dart pub get

RUN mkdir -p /workspace

COPY bin/ ./bin/

EXPOSE 8080

CMD ["dart", "run", "bin/server.dart"]
