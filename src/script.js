// ===== PARTICLE BACKGROUND ANIMATION (DO NOT REMOVE) =====
const canvas = document.getElementById("bgCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

function getThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue('--accent').trim() || '#1F7D53';
        const accent2 = styles.getPropertyValue('--accent-2').trim() || '#255F38';
        return { accent, accent2 };
}

function hexToRgba(hex, alpha) {
        let h = hex.replace('#', '').trim();
        if (h.length === 3) {
                h = h.split('').map(c => c + c).join('');
        }
        const num = parseInt(h.slice(0, 6), 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
}

let THEME = getThemeColors();
window.addEventListener('resize', () => { THEME = getThemeColors(); });
function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let particles = [];
const PARTICLE_COUNT = canvas ? Math.max(50, Math.floor(window.innerWidth / 18)) : 0;

if (canvas) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 2 + 0.8,
                        dx: (Math.random() - 0.5) * 0.8,
                        dy: (Math.random() - 0.5) * 0.8,
                        hue: Math.random() * 360
                });
        }
}

function drawParticles() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
                ctx.beginPath();
                const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius*6);
                grd.addColorStop(0, hexToRgba(THEME.accent, 0.9));
                grd.addColorStop(0.5, hexToRgba(THEME.accent2, 0.55));
                grd.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grd;
                ctx.arc(p.x, p.y, p.radius*3, 0, Math.PI * 2);
                ctx.fill();
        }

        // draw connecting lines
        for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                        const a = particles[i], b = particles[j];
                        const dist = Math.hypot(a.x - b.x, a.y - b.y);
                        if (dist < 140) {
                                ctx.beginPath();
                                ctx.moveTo(a.x, a.y);
                                ctx.lineTo(b.x, b.y);
                                ctx.strokeStyle = hexToRgba(THEME.accent, (1 - dist/140) * 0.25);
                                ctx.lineWidth = 1;
                                ctx.stroke();
                        }
                }
        }
}

function updateParticles() {
        for (let p of particles) {
                p.x += p.dx;
                p.y += p.dy;

                if (p.x < -50) p.x = canvas.width + 50;
                if (p.x > canvas.width + 50) p.x = -50;
                if (p.y < -50) p.y = canvas.height + 50;
                if (p.y > canvas.height + 50) p.y = -50;

                // subtle drift
                p.dx += (Math.random() - 0.5) * 0.02;
                p.dy += (Math.random() - 0.5) * 0.02;
                p.dx *= 0.995;
                p.dy *= 0.995;
        }
}

function animate() {
        drawParticles();
        updateParticles();
        requestAnimationFrame(animate);
}
if (canvas) animate();

// ===== CONFIGURE AFTER DEPLOYING YOUR GOOGLE APPS SCRIPT WEB APP =====
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzagzBLQvsODEI0roJ45nput-V7F6Qf8sDmZeMYDsVL0riua50xlJsXd3PSjPQW4tfbow/exec";

(function () {
    // ---------- COUNTDOWN ----------
    function initCountdown() {
        const container = document.getElementById("countdown");
        const daysEl = document.getElementById("cd-days");
        const hoursEl = document.getElementById("cd-hours");
        const minsEl = document.getElementById("cd-mins");
        const secsEl = document.getElementById("cd-secs");
        if (!container || !daysEl || !hoursEl || !minsEl || !secsEl) return;

        const attr = container.getAttribute("data-target");
        const target = attr ? new Date(attr) : new Date("2025-08-29T09:00:00+05:30");
        const targetMs = target.getTime();

        function pad(n) { return String(n).padStart(2, "0"); }

        if (isNaN(targetMs)) {
            container.style.display = "none"; // Hide countdown if invalid
            return;
        }

        function tick() {
            const now = Date.now();
            let diff = targetMs - now;
            if (diff <= 0) {
                daysEl.textContent = "00";
                hoursEl.textContent = "00";
                minsEl.textContent = "00";
                secsEl.textContent = "00";
                clearInterval(intervalId);
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            diff %= (1000 * 60 * 60 * 24);
            const h = Math.floor(diff / (1000 * 60 * 60));
            diff %= (1000 * 60 * 60);
            const m = Math.floor(diff / (1000 * 60));
            diff %= (1000 * 60);
            const s = Math.floor(diff / 1000);
            daysEl.textContent = pad(d);
            hoursEl.textContent = pad(h);
            minsEl.textContent = pad(m);
            secsEl.textContent = pad(s);
        }

        tick();
        const intervalId = setInterval(tick, 1000);
    }
    initCountdown();

    // ---------- FORM -> GOOGLE SHEETS ----------
    const form = document.getElementById("hackathonForm");
    const msg = document.getElementById("msg");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : "";

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Submitting...";
                }
                msg.textContent = "";

                // Use FormData for file upload
                const formData = new FormData(form);

                const response = await fetch('http://localhost:3000/submit', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    msg.textContent = result.message;
                    msg.style.color = "#08CB00";
                    form.reset();
                    const fileNameEl = document.getElementById("uploadFileName");
                    if (fileNameEl) fileNameEl.textContent = "";
                } else {
                    msg.textContent = "❌ Submission failed: " + result.message;
                    msg.style.color = "#ff4d4f";
                }
            } catch (err) {
                msg.textContent = "❌ Submission failed: Failed to fetch";
                msg.style.color = "#ff4d4f";
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || "Submit";
                }
            }
        });
    }

    // ---------- UPLOAD INTERACTIONS ----------
    (function setupUploadBox() {
        const box = document.getElementById("uploadBox");
        const input = document.getElementById("pptInput");
        const nameEl = document.getElementById("uploadFileName");
        if (!box || !input) return;

        const setName = (file) => {
            if (nameEl) nameEl.textContent = file ? `Selected: ${file.name}` : "";
        };

        box.addEventListener("click", () => input.click());

        box.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                input.click();
            }
        });

        box.addEventListener("dragover", (e) => {
            e.preventDefault();
            box.style.background = "rgba(255,255,255,0.1)";
        });

        box.addEventListener("dragleave", () => {
            box.style.background = "rgba(255,255,255,0.04)";
        });

        box.addEventListener("drop", (e) => {
            e.preventDefault();
            box.style.background = "rgba(255,255,255,0.04)";
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                input.files = e.dataTransfer.files;
                setName(e.dataTransfer.files[0]);
            }
        });

        input.addEventListener("change", () => {
            const f = input.files && input.files[0];
            setName(f || null);
        });
    })();

    // ---------- LOCAL SUBMISSION EXAMPLE ----------
    const localForm = document.getElementById('yourFormId');
    if (localForm) {
        localForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(localForm);

            try {
                const response = await fetch('http://localhost:3000/submit', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    alert(result.message);
                } else {
                    alert('❌ Submission failed: ' + result.message);
                }
            } catch (err) {
                alert('❌ Submission failed: Failed to fetch');
            }
        });
    }
})();


