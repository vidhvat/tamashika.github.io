// === SHADER CODE: edit these strings ===
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

  void main() {
    // Normalized coordinates (0..1)
    vec2 uv = v_uv;

    // Simple example: animated gradient
    float t = u_time * 0.2;
    vec3 color = 0.5 + 0.5 * cos(6.28318 * vec3(uv.x + t, uv.y - t, t) + vec3(0.0, 2.0, 4.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;
// === END SHADER CODE ===

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

