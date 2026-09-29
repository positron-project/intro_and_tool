import fs from 'node:fs';

const src = fs.readFileSync('src/styles.css', 'utf8');
const cutIdx = src.indexOf('.home-story-scroll');
if (cutIdx === -1) {
  console.error('Could not find .home-story-scroll in src/styles.css');
  process.exit(1);
}

const baseCss = src.slice(0, cutIdx).trimEnd();

const storyCss = `
/* ==========================================================================
   Home Story Showcase (02 - 06 Sections): Seamless Minimal Dark
   ========================================================================== */

.home-story-scroll {
  min-height: 100svh;
  width: 100%;
  position: relative;
  background-color: #08090c;
  background-image: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
  background-attachment: fixed;
  color: #f1f5f9;
}

.home-story-page {
  min-height: 100svh;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.home-story-section {
  position: relative;
  padding: clamp(64px, 8vw, 110px) 0;
  box-sizing: border-box;
}

.section-container {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 40px);
  position: relative;
  z-index: 2;
  box-sizing: border-box;
}

.story-header-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin-bottom: 16px;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #71717a;
}

.section-title-wrap {
  margin-bottom: clamp(32px, 4.5vw, 56px);
}

.section-title-wrap h2 {
  font-size: clamp(24px, 3.2vw, 38px);
  font-weight: 800;
  line-height: 1.25;
  color: #ffffff;
  letter-spacing: -0.03em;
  margin: 0 0 10px;
}

.section-title-wrap p {
  font-size: clamp(14px, 1.4vw, 16px);
  line-height: 1.6;
  color: #94a3b8;
  margin: 0;
  max-width: 720px;
}

/* ==========================================================================
   Section 02: Team Highlights
   ========================================================================== */

.team-highlights-section {
  background: transparent;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.feature-card {
  padding: 28px 30px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: all 0.22s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.045);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
}

.feature-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.feature-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.feature-num {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.18);
  letter-spacing: -0.02em;
}

.feature-tag {
  align-self: flex-start;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.feature-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}

.feature-desc {
  font-size: 13.5px;
  line-height: 1.65;
  color: #94a3b8;
  margin: 0 0 20px;
  flex: 1;
}

.feature-footer-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #94a3b8;
}

.note-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #71717a;
  flex: 0 0 auto;
}

/* ==========================================================================
   Section 03: Minecraft Community
   ========================================================================== */

.minecraft-section {
  background: transparent;
}

.pill-pulse-green {
  background: #10b981;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.minecraft-split {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 28px;
  align-items: stretch;
}

.mc-info-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.mc-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.mc-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
}

.mc-version-tag {
  font-family: var(--mono);
  font-size: 11px;
  color: #94a3b8;
}

.mc-card-title {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}

.mc-lead {
  font-size: 13.5px;
  line-height: 1.65;
  color: #94a3b8;
  margin: 0 0 20px;
}

.mc-ip-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #0c0d12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  margin-bottom: 22px;
  gap: 16px;
}

.mc-ip-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ip-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 700;
}

.ip-value {
  font-family: var(--mono);
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.ip-ports {
  font-size: 11px;
  color: #64748b;
}

.mc-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: #ffffff;
  color: #090a0f;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mc-copy-btn:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.mc-copy-btn.is-copied {
  background: #27272a;
  color: #ffffff;
}

.mc-feature-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.mc-pill-item {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mc-pill-item strong {
  font-size: 12px;
  color: #e2e8f0;
}

.mc-pill-item span {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.mc-actions-row {
  margin-top: auto;
}

.mc-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.mc-visual-window {
  display: flex;
  flex-direction: column;
  background: #090a0f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.terminal-title {
  font-family: var(--mono);
  font-size: 11px;
  color: #64748b;
}

.terminal-tps {
  font-family: var(--mono);
  font-size: 11px;
  color: #10b981;
}

.terminal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.mc-pixel-banner {
  padding: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  margin-bottom: 16px;
  text-align: center;
}

.pixel-logo {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ffffff;
}

.pixel-tagline {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.terminal-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 20px;
  flex: 1;
}

.term-line {
  color: #94a3b8;
}

.term-line.log-ok { color: #60a5fa; }
.term-line.log-success { color: #10b981; }
.term-line.log-player { color: #fbbf24; }
.term-line.log-event { color: #c084fc; }

.mc-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.mc-stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
}

.mc-stat-box strong {
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
}

.mc-stat-box span {
  font-size: 11px;
  color: #64748b;
}

/* ==========================================================================
   Section 04: Projects Showcase
   ========================================================================== */

.projects-zigzag-section {
  background: transparent;
}

.zigzag-project-list {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.zigzag-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 44px;
  align-items: center;
  padding: 34px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  transition: all 0.25s ease;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3);
}

.zigzag-item:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.zigzag-item.text-right .zigzag-text-col {
  order: 2;
}

.zigzag-item.text-right .zigzag-visual-col {
  order: 1;
}

.project-top-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.status-badge {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.project-year-badge {
  font-family: var(--mono);
  font-size: 11px;
  color: #64748b;
}

.project-heading {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

.project-tagline {
  font-size: 13.5px;
  font-weight: 500;
  color: #cbd5e1;
  margin: 0 0 12px;
  line-height: 1.45;
}

.project-desc {
  font-size: 13px;
  line-height: 1.65;
  color: #94a3b8;
  margin: 0 0 18px;
}

.project-tech-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.stack-title {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
}

.stack-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stack-pill {
  font-family: var(--mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.project-meta-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 20px;
}

.project-meta-strip span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #94a3b8;
}

.project-action-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.project-preview-mockup {
  background: #090a0f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.mockup-window-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mockup-dots {
  display: flex;
  gap: 5px;
}

.mockup-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.mockup-address {
  font-family: var(--mono);
  font-size: 10px;
  color: #64748b;
}

.mockup-chip {
  font-family: var(--mono);
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.mockup-body {
  padding: 20px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.visual-agent-pipeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pipeline-step {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pipeline-step.core-step {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
}

.step-label {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
}

.pipeline-step strong {
  font-size: 12px;
  color: #ffffff;
}

.pipeline-step small {
  font-size: 11px;
  color: #94a3b8;
}

.pipeline-flow-arrow {
  text-align: center;
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.visual-oj-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oj-snippet-box {
  background: #07080b;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px 14px;
}

.snippet-lang {
  font-family: var(--mono);
  font-size: 10px;
  color: #64748b;
  display: block;
  margin-bottom: 6px;
}

.oj-snippet-box pre {
  margin: 0;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.45;
  color: #cbd5e1;
}

.oj-verdict-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.verdict-tag.verdict-ac {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: #10b981;
}

.verdict-stat {
  font-family: var(--mono);
  font-size: 10px;
  color: #94a3b8;
}

.oj-verdict-card small {
  font-size: 10px;
  color: #64748b;
}

.visual-lab-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lab-schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lab-schedule-header strong {
  font-size: 12.5px;
  color: #ffffff;
}

.badge-live {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border-radius: 4px;
}

.lab-slots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
}

.slot-occupied {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #94a3b8;
}

.slot-occupied .slot-user {
  font-size: 11px;
  color: #64748b;
}

.slot-free {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.slot-free .slot-status {
  font-size: 11px;
  color: #34d399;
}

.visual-map-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-grid-canvas {
  position: relative;
  width: 100%;
  height: 190px;
  background: #08090c;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-grid-lines {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}

.map-pin {
  position: absolute;
  padding: 3px 8px;
  background: #18191e;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  font-size: 10px;
  color: #cbd5e1;
  white-space: nowrap;
}

.map-pin.pin-center {
  top: 42%;
  left: 36%;
  border-color: #ffffff;
  color: #ffffff;
  background: #27272a;
  font-weight: 700;
  z-index: 2;
}

.map-pin.pin-1 { top: 16%; left: 16%; }
.map-pin.pin-2 { bottom: 20%; right: 14%; }
.map-pin.pin-3 { top: 68%; left: 20%; }

.map-info-strip {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  padding: 0 4px;
}

/* ==========================================================================
   Section 05: Recent Activities
   ========================================================================== */

.recent-activities-section {
  background: transparent;
}

.activity-card-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.activity-split-card {
  display: grid;
  grid-template-columns: 210px 1px 1fr;
  gap: 24px;
  padding: 26px 30px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: all 0.22s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.activity-split-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.045);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
}

.activity-left-col {
  display: flex;
  flex-direction: column;
}

.event-special-tag {
  align-self: flex-start;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.event-short-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 14px;
}

.event-date-divider {
  margin-top: auto;
}

.event-date-block {
  display: flex;
  flex-direction: column;
}

.event-date-text {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.event-weekday-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.activity-middle-divider {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.divider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.divider-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #71717a;
  z-index: 1;
}

.activity-right-col {
  display: flex;
  flex-direction: column;
}

.activity-right-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 10px;
}

.activity-full-title {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
}

.activity-status-pill {
  flex: 0 0 auto;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.activity-description {
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 16px;
}

.activity-info-row {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.activity-meta-item {
  font-size: 12px;
  color: #64748b;
}

.activity-meta-item strong {
  color: #94a3b8;
}

.activity-action-row {
  margin-top: auto;
}

.activity-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 0;
  color: #e2e8f0;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.activity-action-btn:hover {
  color: #ffffff;
  transform: translateX(3px);
}

/* ==========================================================================
   Section 06: Contact & Join Us + Footer
   ========================================================================== */

.contact-join-section {
  background: transparent;
}

.contact-main-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 28px;
  align-items: stretch;
}

.contact-qq-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.qq-card-badge {
  display: inline-block;
  align-self: flex-start;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 3px 9px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  border-radius: 5px;
  margin-bottom: 12px;
}

.contact-qq-card h3 {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.qq-tip {
  font-size: 12.5px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 18px;
}

.qq-tip strong {
  color: #e2e8f0;
}

.qq-number-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #0c0d12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  margin-bottom: 12px;
  gap: 12px;
}

.qq-number-box.admin-box {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
  padding: 10px 16px;
}

.qq-number-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qq-number-info .label {
  font-size: 12px;
  color: #64748b;
}

.num-display {
  font-family: var(--mono);
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.03em;
}

.num-display.admin-num {
  font-size: 14px;
  color: #cbd5e1;
}

.qq-copy-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ffffff;
  color: #090a0f;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
}

.qq-copy-button:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.qq-copy-button.small-copy {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.qq-copy-button.small-copy:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.qq-copy-button.is-copied {
  background: #27272a;
  color: #ffffff;
}

.qr-code-zone {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.qr-box-mockup {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  background: #07080a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.qr-scan-label {
  font-size: 9px;
  color: #64748b;
  margin-top: 4px;
}

.qr-center-icon {
  color: #e2e8f0;
}

.qr-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qr-note strong {
  font-size: 13.5px;
  color: #ffffff;
}

.qr-note small {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
}

.contact-info-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.lab-location-banner {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #0c0d12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  margin-bottom: 22px;
}

.loc-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex: 0 0 auto;
}

.lab-location-banner h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.lab-location-banner p {
  margin: 0 0 6px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.45;
}

.open-time {
  font-family: var(--mono);
  font-size: 11px;
  color: #10b981;
}

.audience-title {
  margin: 0 0 12px;
  font-size: 13.5px;
  color: #cbd5e1;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}

.audience-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audience-card strong {
  font-size: 12.5px;
  color: #ffffff;
}

.audience-card p {
  margin: 0;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
}

.contact-quick-portals {
  display: flex;
  gap: 10px;
  margin-top: auto;
  flex-wrap: wrap;
}

.home-story-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 28px;
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-meta-links {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 12px;
}

.school-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.18s ease;
}

.school-link:hover {
  color: #ffffff;
}

.footer-link-btn {
  background: transparent;
  border: none;
  padding: 0;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.18s ease;
}

.footer-link-btn:hover {
  color: #ffffff;
}

.story-back-top-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.story-back-top-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* ==========================================================================
   Top Capsule Navigation Bar (.home-topbar)
   ========================================================================== */

.home-topbar {
  position: fixed;
  top: 18px;
  left: 50%;
  z-index: 60;
  width: max-content;
  max-width: calc(100% - 32px);
  height: 40px;
  overflow: visible;
  transform: translate(-50%);
  background: rgba(14, 16, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px) saturate(135%);
  -webkit-backdrop-filter: blur(20px) saturate(135%);
}

.home-topbar:before {
  display: none;
}

.home-topbar .topbar-inner {
  height: 40px;
  padding: 0 10px 0 14px;
  gap: 12px;
  display: flex;
  align-items: center;
}

.home-topbar .topbar-actions {
  gap: 6px;
  display: flex;
  align-items: center;
}

.home-topbar .main-nav {
  gap: 2px;
  padding: 2px;
  background: transparent;
  border: none;
  border-radius: 999px;
  display: flex;
  align-items: center;
}

.home-topbar .brand {
  gap: 7px;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  text-decoration: none;
}

.home-topbar .brand-logo {
  width: 22px;
  height: 22px;
  border-radius: 5px;
}

.home-topbar .brand-copy strong {
  font-size: 12px;
  color: #ffffff;
}

.home-topbar .brand-copy small {
  display: none;
}

.home-topbar .nav-link {
  height: 32px;
  min-height: 32px;
  padding: 0 12px;
  color: #94a3b8;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: color 0.18s ease, background 0.18s ease;
}

.home-topbar .nav-link:after {
  display: none;
}

.home-topbar .nav-link:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.home-topbar .nav-link.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.home-topbar .search-trigger {
  height: 28px;
  padding: 0 8px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #94a3b8;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.home-topbar .search-trigger:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
}

.home-topbar .search-trigger kbd {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  color: #64748b;
}

.home-topbar .icon-button,
.home-topbar .profile-button {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: transparent;
  border: none;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease;
}

.home-topbar .icon-button:hover,
.home-topbar .profile-button:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

/* ==========================================================================
   Responsive Adaptations
   ========================================================================== */

@media (max-width: 1024px) {
  .minecraft-split {
    grid-template-columns: 1fr;
  }
  .zigzag-item {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .zigzag-item.text-right .zigzag-text-col,
  .zigzag-item.text-right .zigzag-visual-col {
    order: unset;
  }
  .contact-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  .mc-feature-pills {
    grid-template-columns: 1fr;
  }
  .mc-ip-box {
    flex-direction: column;
    align-items: flex-start;
  }
  .mc-copy-btn {
    width: 100%;
    justify-content: center;
  }
  .activity-split-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .activity-middle-divider {
    display: none;
  }
  .audience-grid {
    grid-template-columns: 1fr;
  }
  .home-story-footer {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  .footer-meta-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 1180px) and (min-width: 1041px) {
  .home-topbar .topbar-inner {
    gap: 10px;
  }
  .home-topbar .brand {
    min-width: 205px;
  }
  .home-topbar .nav-link {
    gap: 5px;
    padding: 0 7px;
    font-size: 11px;
  }
  .home-topbar .nav-link:after {
    display: none;
  }
  .home-topbar .search-trigger {
    width: 152px;
  }
}

@media (max-width: 1040px) {
  .home-topbar {
    top: 12px;
    width: calc(100% - 32px);
    max-width: none;
    height: 44px;
    border-radius: 16px;
  }
  .home-topbar .topbar-inner {
    width: 100%;
    padding: 0 12px;
    gap: 8px;
  }
  .home-topbar .topbar-actions {
    display: flex;
    margin-left: auto;
  }
  .home-topbar .brand {
    min-width: 0;
  }
  .home-topbar .brand-copy small,
  .home-topbar .search-trigger,
  .home-topbar .search-trigger span,
  .home-topbar .search-trigger kbd,
  .home-topbar .profile-button,
  .home-topbar .theme-button {
    display: none;
  }
  .home-topbar .brand-copy strong {
    font-size: 12px;
  }
  .home-topbar .main-nav {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    left: 0;
    display: none;
    flex-direction: column;
    align-items: stretch;
    height: auto;
    padding: 8px;
    background: rgba(14, 16, 22, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(18px) saturate(145%);
    -webkit-backdrop-filter: blur(18px) saturate(145%);
  }
  .home-topbar .main-nav.is-open {
    display: flex;
  }
  .home-topbar .main-nav {
    margin: 0;
  }
  .home-topbar .nav-link {
    height: 40px;
    min-height: 40px;
    justify-content: flex-start;
    padding: 0 12px;
    color: #94a3b8;
  }
  .home-topbar .nav-link:after {
    display: none;
  }
  .home-topbar .nav-link.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }
  .home-topbar .search-trigger {
    width: 34px;
    justify-content: center;
    padding: 0;
  }
  .home-topbar .mobile-menu {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .home-topbar {
    top: 8px;
    width: calc(100% - 20px);
    height: 41px;
    border-radius: 14px;
  }
  .home-topbar .topbar-inner {
    padding: 0 9px;
  }
  .home-topbar .brand-logo {
    width: 30px;
    height: 30px;
  }
  .home-topbar .brand-copy strong {
    font-size: 11px;
  }
  .home-topbar .main-nav {
    border-radius: 14px;
  }
}
`;

const fullCss = baseCss + '\n\n' + storyCss.trimStart();
fs.writeFileSync('src/styles.css', fullCss, 'utf8');
console.log('src/styles.css generated successfully! Total bytes:', fullCss.length);
