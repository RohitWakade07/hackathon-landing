// Particle Background Animation
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

// Theme colors from CSS variables
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let particles = [];
const PARTICLE_COUNT = Math.max(50, Math.floor(window.innerWidth / 18));

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

function drawParticles() {
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
animate();

// Countdown Timer (to 29 Aug 2025, 36 hours duration shown as start countdown)
(function setupCountdown() {
    const start = new Date('2025-08-29T09:00:00+05:30');
    function update() {
        const now = new Date();
        let diff = Math.max(0, start - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        diff -= days * (1000 * 60 * 60 * 24);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        diff -= hours * (1000 * 60 * 60);
        const mins = Math.floor(diff / (1000 * 60));
        diff -= mins * (1000 * 60);
        const secs = Math.floor(diff / 1000);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2,'0'); };
        set('cd-days', days);
        set('cd-hours', hours);
        set('cd-mins', mins);
        set('cd-secs', secs);
    }
    update();
    setInterval(update, 1000);
})();

// Form Submission
document.getElementById("hackathonForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const fileInput = document.getElementById('pptInput');
    const hasFile = fileInput && fileInput.files && fileInput.files[0];

    const payload = new FormData();
    payload.append('teamName', this.teamName.value.trim());
    payload.append('teamSize', this.teamSize.value);
    payload.append('name', this.name.value.trim());
    payload.append('phone', this.phone.value.trim());
    payload.append('email', this.email.value.trim());
    payload.append('college', this.college.value.trim());
    payload.append('year', this.year.value);
    payload.append('track', this.track.value);
    payload.append('github', this.github.value.trim());
    payload.append('experience', this.experience.value);
    payload.append('members', this.members.value.trim());
    payload.append('projectIdea', this.projectIdea.value.trim());
    payload.append('agree', this.agree.checked ? 'true' : 'false');
    payload.append('consent', this.consent.checked ? 'true' : 'false');
    if (hasFile) payload.append('ppt', fileInput.files[0]);

    try {
        const res = await fetch("/submit", {
            method: "POST",
            body: payload
        });

        if (!res.ok) throw new Error('Network response was not ok');

        const result = await res.json();
        document.getElementById("msg").textContent = result.message;
        document.getElementById("msg").style.color = "lightgreen";
        this.reset();
    } catch (err) {
        console.error(err);
        document.getElementById("msg").textContent = '❌ Registration failed. Try again later.';
        document.getElementById("msg").style.color = "salmon";
    }
});

// Upload interactions
(function setupUploadBox(){
    const box = document.getElementById('uploadBox');
    const input = document.getElementById('pptInput');
    const nameEl = document.getElementById('uploadFileName');
    if (!box || !input) return;
    const setName = f => { nameEl.textContent = f ? `Selected: ${f.name}` : ''; };
    box.addEventListener('click', () => input.click());
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }});
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.style.background = 'rgba(255,255,255,0.08)'; });
    box.addEventListener('dragleave', () => { box.style.background = 'rgba(255,255,255,0.04)'; });
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.style.background = 'rgba(255,255,255,0.04)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            input.files = e.dataTransfer.files;
            setName(e.dataTransfer.files[0]);
        }
    });
    input.addEventListener('change', () => setName(input.files[0]));
})();
