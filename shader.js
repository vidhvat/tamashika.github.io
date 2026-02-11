const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  varying vec2 v_uv;

  float hashFractSin(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float rangeClip(float value, float minVal, float maxVal) {
    return step(minVal, value) * (1.0 - step(maxVal, value));
  }

  void main() {
    vec2 Dims = u_resolution;
    float Fold = 0.96 + sin(u_time/1.0) * 0.001;              
    float Time = u_time/4.0;
    float Clock = u_time/4.0;           

    const float RAINBOW_START = 64.0;
    const float SKY_END = 12.0;

    float scaling = Dims.x / Dims.y;
    float fold = fract(Fold);
    float temp = floor(Fold) / 100.0;
    float rad = scaling * (1.0 - fold);
    float bend = mix(2.0, 16.0, pow((1.0 - fold) / 2.0, 2.0));

    vec2 texCoord = v_uv;
    vec2 displacement = vec2(texCoord.x * scaling, texCoord.y) - vec2(0.5 * scaling, 0.5);

    // In GLSL, pow(negative, non-integer) is undefined (NaN), so we need abs()
    float distance = pow(abs(displacement.x / rad), bend) + pow(abs(displacement.y / rad), bend);

    vec4 rainbow = mix(
      vec4(hsv2rgb(vec3(Time + pow(abs(1.0 - (distance - RAINBOW_START) / 64.0), 8.0), 0.7, 1.0)), 1.0),
      vec4(
        hashFractSin(displacement),
        hashFractSin(displacement + Time),
        hashFractSin(displacement - Time),
        1.0
      ),
      (distance - RAINBOW_START) / (256.0 - RAINBOW_START)
    );
    // rainbow += vec4(1.0) * rangeClip(distance, RAINBOW_START, 33.0);

    float sunangle = -6.2831 * Clock - (fold - 1.0) * 3.141 * 0.75;
    vec2 sunpos = vec2(sin(sunangle), cos(sunangle)) * 0.5 * fold;

    float atmo = clamp(pow((distance - 1.2) / (SKY_END - 1.2), 2.0), 0.0, 1.0);
    vec4 daybase = vec4(0.35, 0.73, 0.894, 0.25);
    vec4 skycol = mix(daybase, daybase * 1.3, atmo);
    vec4 heatshade = mix(vec4(0.95, 0.4, 0.25, 1.0), vec4(0.0, 0.0, 0.0, 0.0), (1.0 - atmo) * temp);
    skycol = mix(skycol, heatshade, atmo * temp);

    vec4 atmos = mix(
      vec4(0.2, 0.2, 0.2, 0.0),
      skycol,
      pow(abs(1.0 - (distance - SKY_END) / (RAINBOW_START - SKY_END)), 16.0)
    );

    vec4 color =
      vec4(1.0) * rangeClip(distance, 1.0, 1.2) +
      skycol * rangeClip(distance, 1.2, SKY_END) +
      atmos * rangeClip(distance, SKY_END, RAINBOW_START) +
      rainbow * rangeClip(distance, RAINBOW_START, 2048.0);

    gl_FragColor = color;
    
// gl_FragColor = vec4(vec3(distance / 100.0), 1.0);
  }
`;

const canvas = document.getElementById('bg');
const gl = canvas && canvas.getContext('webgl');

if (gl) {
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(window.innerWidth * dpr);
    const displayHeight = Math.floor(window.innerHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(vsSource, fsSource) {
    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  const program = createProgram(vertexShaderSource, fragmentShaderSource);

  if (program) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Fullscreen quad (two triangles) in clip space
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const uTimeLocation = gl.getUniformLocation(program, 'u_time');

    const startTime = performance.now();

    function render() {
      resize();

      const time = (performance.now() - startTime) / 1000.0;

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(aPositionLocation);
      gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(uTimeLocation, time);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    render();
  }
} else {
  console.warn('WebGL not supported');
}

