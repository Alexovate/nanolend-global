---
marp: true
theme: default
paginate: true
backgroundColor: "#FFFFFF"
color: "#2E3238"
header: '<div style="text-align: right; color: #64B5F6; font-weight: bold; font-size: 0.9em;">NanoLend Global | ETH Global NYC 2025</div>'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  section {
    font-family: 'Inter', sans-serif;
    padding: 40px;
    font-size: 1em;
    background: #FFFFFF;
    color: #2E3238;
  }

  section::after {
    left: auto !important;
    right: 15px !important;
    bottom: 15px !important;
    color: #64B5F6 !important;
    font-size: 1.1em !important;
    font-weight: 600;
  }

  header {
    position: absolute;
    top: 15px;
    right: 25px;
    width: auto;
    height: auto;
  }

  h1 {
    font-family: 'Inter', sans-serif;
    font-size: 3.5em;
    font-weight: 700;
    margin-bottom: 0.2em;
    color: #64B5F6;
  }

  h2 {
    color: #2E3238; 
    margin-top: 0.5em;
    margin-bottom: 0.3em;
    font-size: 2.4em;
    font-weight: 600;
  }

  h3 {
    display: inline-block;
    background-color: #64B5F6;
    color: #FFFFFF !important;
    padding: 6px 14px;
    border-radius: 6px;
    margin-top: 0.8em;
    margin-bottom: 0.5em;
    font-size: 1.6em;
    font-weight: 600;
  }

  .intro {
    text-align: center;
    padding-top: 80px;
  }

  .intro h1 {
    font-size: 5em;
    color: #64B5F6;
    margin-bottom: 0.3em;
  }

  .tagline {
    font-size: 2.5em;
    font-style: italic;
    color: #2E3238;
    margin-top: 0.5em;
    margin-bottom: 1.5em;
    font-weight: 500;
  }

  .subtitle {
    font-size: 1.6em;
    color: #666;
    margin-bottom: 2em;
    font-weight: 500;
  }

  ul {
    margin-top: 0.2em;
    margin-bottom: 0.2em;
    padding-left: 1.2em;
  }

  li {
    margin-bottom: 0.3em;
    font-size: 1.4em;
    color: #2E3238;
    line-height: 1.4;
  }

  .highlight {
    color: #64B5F6;
    font-weight: 600;
  }

  .success {
    color: #35D07F;
    font-weight: 600;
  }

  .feature-box {
    background: #f8f8f8;
    border-left: 4px solid #64B5F6;
    padding: 15px 20px;
    margin: 15px 0;
    border-radius: 0 8px 8px 0;
    font-size: 1.3em;
  }

  .achievement-box {
    background: #f8f8f8;
    border: 1px solid rgba(100, 181, 246, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin: 15px 0;
    font-size: 1.3em;
  }

  .stat-circle {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background-color: rgba(100, 181, 246, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    border: 2px solid #64B5F6;
    margin: 0 auto;
  }

  .stat-value {
    font-size: 3.5em;
    font-weight: bold;
    color: #64B5F6;
    margin-bottom: 0.1em;
  }

  .stat-label {
    font-size: 1.1em;
    color: #2E3238;
    padding: 0 15px;
    line-height: 1.2;
  }

  .demo-callout {
    background: linear-gradient(135deg, #35D07F 0%, #2AC66D 100%);
    color: #FFFFFF;
    padding: 30px;
    border-radius: 16px;
    text-align: center;
    font-size: 1.6em;
    font-weight: 600;
    margin: 30px 0;
  }

  .tech-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
    margin: 25px 0;
  }

  .tech-item {
    background: #f8f8f8;
    border: 1px solid rgba(100, 181, 246, 0.3);
    border-radius: 12px;
    padding: 25px;
    text-align: center;
  }

  .tech-icon {
    font-size: 2.5em;
    margin-bottom: 15px;
  }

  .tech-title {
    font-size: 1.3em;
    font-weight: 600;
    color: #2E3238;
    margin-bottom: 8px;
  }

  .tech-desc {
    font-size: 1em;
    color: #666;
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3rem;
    align-items: start;
  }

  .contact-info {
    font-size: 1.6em;
    font-weight: 600;
    text-align: center;
    margin-top: 30px;
    color: #64B5F6;
  }

  .badge {
    background-color: #64B5F6;
    color: white;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 1em;
    display: inline-block;
    margin: 5px;
  }

  .success-badge {
    background-color: #35D07F;
    color: white;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 1em;
    display: inline-block;
    margin: 5px;
  }
---

<!-- Title Slide -->
<div class="intro">

# NanoLend Global

<div class="tagline">Proof of Identity, Not Proof of Wealth</div>

<div class="subtitle">World Chain → Ethereum → Solana</div>

<div style="margin-top: 40px;">
<span class="badge">ETH Global NYC 2025</span>
<span class="success-badge">48 Hours Build</span>
<span class="badge">World Chain</span>
</div>

</div>

---

# The Problem: 1.4B People Excluded

<div style="display: flex; justify-content: center; align-items: center; margin: 40px 0;">
  <div class="stat-circle">
    <div class="stat-value">1.4B</div>
    <div class="stat-label">Adults without access to traditional banking</div>
  </div>
  
  <div style="width: 60px; text-align: center; padding: 0 15px; color: #64B5F6;">
    <div style="font-size: 2em;">→</div>
  </div>
  
  <div class="stat-circle">
    <div class="stat-value">$8T</div>
    <div class="stat-label">BNPL market growing 25% annually</div>
  </div>
</div>

### Current BNPL Limitations

<div class="feature-box">
<strong>Centralized platforms</strong> require credit scores that exclude emerging markets
</div>

<div class="feature-box">
<strong>High fees (3-8%)</strong> and single-chain restrictions limit global accessibility  
</div>

---

# Our Solution: Multi-Chain BNPL

<div class="tech-grid">
  <div class="tech-item">
    <div class="tech-icon">🌍</div>
    <div class="tech-title">World ID Verification</div>
    <div class="tech-desc">Sybil-resistant identity without banking history</div>
  </div>
  <div class="tech-item">
    <div class="tech-icon">⛓️</div>
    <div class="tech-title">Multi-Chain Ready</div>
    <div class="tech-desc">World Chain live, Ethereum + Solana planned</div>
  </div>
  <div class="tech-item">
    <div class="tech-icon">📱</div>
    <div class="tech-title">Mobile-First Design</div>
    <div class="tech-desc">World App optimized interface</div>
  </div>
  <div class="tech-item">
    <div class="tech-icon">🏗️</div>
    <div class="tech-title">Production Contracts</div>
    <div class="tech-desc">Live smart contracts with comprehensive testing</div>
  </div>
</div>

<div class="achievement-box" style="text-align: center; margin-top: 30px;">
<strong>Current:</strong> World Chain BNPL with World ID verification - cross-chain bridging in development
</div>

---

# Live Demo Time!

<div class="demo-callout">
🚀 Complete BNPL cycle in under 2 minutes
</div>

<div class="columns">
<div>

### Demo Flow

1. **🏪 Merchant Selection**
2. **🆔 World ID Verification**
3. **💰 Instant Loan Approval**
4. **📱 Mobile Dashboard**
5. **🔄 Easy Repayment**

</div>
<div>

### Key Features

<div class="achievement-box">
<strong>Real Transactions:</strong> Live smart contract on World Chain
</div>

<div class="achievement-box">
<strong>Mobile-First:</strong> Optimized for World App
</div>

</div>
</div>

---

# Technical Innovation

<div class="columns">
<div>

### Current Integrations

<span class="success-badge">✅ World ID</span>
<span class="success-badge">✅ MiniKit</span>
<span class="badge">🔄 Circle CCTP (In Progress)</span>
<span class="badge">🔄 Coinbase CDP (Planned)</span>

### Architecture

- **Smart Contracts:** Foundry + OpenZeppelin
- **Frontend:** Next.js 15 + TypeScript
- **Mobile:** World App optimized
- **Blockchain:** World Chain (live), multi-chain planned

</div>
<div>

### 48-Hour Achievements

<div class="achievement-box">
<strong>Production Smart Contracts</strong><br/>
Complete lending system with 95%+ test coverage
</div>

<div class="achievement-box">
<strong>Mobile-First UI</strong><br/>
Real-time dashboards and seamless UX
</div>

<div class="achievement-box">
<strong>Live World ID Integration</strong><br/>
Functional identity verification and BNPL flows
</div>

</div>
</div>

---

# Market Opportunity: Philippines First

<div style="display: flex; justify-content: center; align-items: center; margin: 40px 0;">
  <div class="stat-circle">
    <div class="stat-value">1.3M</div>
    <div class="stat-label">Sari-Sari Stores in Philippines</div>
  </div>
  
  <div style="width: 60px; text-align: center; padding: 0 15px; color: #64B5F6;">
    <div style="font-size: 2em;">+</div>
  </div>
  
  <div class="stat-circle">
    <div class="stat-value">81M</div>
    <div class="stat-label">GCash Active Users (Philippines Only)</div>
  </div>
</div>

<div class="achievement-box">
<strong>📱 Digital Payment Infrastructure:</strong> GCash dominates with 81M active users and 6M+ merchants
</div>

<div class="achievement-box">
<strong>🏪 Retail Network:</strong> 1.3M sari-sari stores handle 60% of FMCG sales nationwide
</div>

<div class="achievement-box">
<strong>🎯 Financial Gap:</strong> 34.3M adults remain unbanked despite smartphone adoption
</div>

---

# Future Vision

<div class="columns">
<div>

### Immediate Roadmap

- **🟣 Solana Integration** - Ultra-low cost
- **🔄 Advanced Bridging** - Multi-chain expansion
- **📊 Credit Scoring** - ML-powered risk assessment
- **🏪 Merchant Tools** - Dashboard and analytics

### Impact Target

<div style="text-align: center; margin: 20px 0;">
  <div class="stat-circle" style="width: 150px; height: 150px;">
    <div class="stat-value" style="font-size: 2.5em;">100M</div>
    <div class="stat-label" style="font-size: 0.9em;">People with credit access by 2030</div>
  </div>
</div>

</div>
<div>

### Partnership Pipeline

<div class="achievement-box">
<strong>🌍 ADB Collaboration</strong><br/>
Pacific region pilot programs
</div>

<div class="achievement-box">
<strong>🎯 Geographic Focus</strong><br/>
Southeast Asia, Africa, Latin America
</div>

<div class="achievement-box">
<strong>💡 Sustainability Model</strong><br/>
1% transaction fees fund expansion
</div>

</div>
</div>

---

<!-- Call to Action Slide -->
<div class="intro">

# NanoLend Global

<div class="tagline">Giving humanity the benefit of the doubt</div>

<div class="contact-info" style="margin-top: 50px;">
💻 github.com/alexovate/nanolend-global
</div>

<div style="margin-top: 50px;">
<span class="success-badge">🚀 Let's bring BNPL to 1.4B people</span>
</div>

</div>
