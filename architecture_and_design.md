# NetGraph Sentinel - Architectural & Design Specification

## 1. Product Definition

**Product Name:** NetGraph Sentinel
**Tagline:** "Illuminate Your Network. Master Your Security."

**Purpose:**
NetGraph Sentinel is a professional-grade Network Observability & Security Intelligence Platform. It bridges the gap between raw network data and actionable administrative insights by combining active topology discovery with AI-driven log analysis. It is designed to turn the "invisible" web of network interactions into a tangible, queryable, and beautiful interactive map.

**Target Audience:**
- **Primary:** SOC Analysts, Network Administrators, Cybersecurity Engineers.
- **Secondary:** IT Consultants, Managed Service Providers (MSPs).

**Key Use Cases:**
- **Shadow IT Discovery:** Instantly identifying unauthorized devices on a sub-net.
- **Incident Response:** Correlating a security alert with a specific device's physical location and recent traffic logs.
- **Compliance Auditing:** Visualizing network segmentation and ensuring critical assets are isolated.
- **Operational Troubleshooting:** Asking the AI, "Why is the Accounting Server slow?" and having it analyze latency logs and topology bottlenecks.

---

## 2. System Architecture

We will adopt a **Hybrid Microservices Architecture** to leverage the best tools for UI/UX (Node/TS) and Data/AI (Python).

### High-Level Stack
| Component | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router)** | Industry standard for reliable, SEO-friendly, server-rendered React apps. |
| **Styling** | **Tailwind CSS + Framer Motion** | Tailwind for rapid, consistent styling; Framer for premium, smooth micro-interactions. |
| **Data Viz** | **React Flow** | Best-in-class library for node-based interactive graphs (Topology). |
| **BFF / API** | **Next.js Server Actions / API Routes** | Handles Auth, User Data, and proxying requests to the Core Engine. |
| **Core Engine** | **Python (FastAPI + Celery)** | Python acts as the "Heavy Lifter". It requires low-level access for scanning (Scapy/Nmap) and best-in-class AI libraries (LangChain/PydanticAI). |
| **Database** | **PostgreSQL + pgvector** | Unified store for relational users/devices and vector embeddings for logs/RAG. |
| **Queue** | **Redis** | Broker for async tasks (scanning, log parsing) and caching. |
| **Auth** | **Auth.js (NextAuth)** | Secure, flexible authentication supporting OAuth and Credentials. |

### Communication Flow
1.  **User > Frontend**: User initiates a "Scan" from the Dashboard.
2.  **Frontend > Redis**: Next.js pushes a scan job to the generic queue.
3.  **Python Worker > Network**: Celery worker picks up the job, runs discovery (Nmap/ARP), and processes logs.
4.  **Python Worker > DB**: Saves discovered nodes/edges and generates embeddings for any new logs.
5.  **Frontend > User**: UI updates via polling or WebSockets (Pusher/Socket.io) to show real-time graph construction.

---

## 3. Backend Design

### Authentication & Security
- **RBAC (Role-Based Access Control):**
    - `Admin`: Full access to scanning, settings, and billing.
    - `Analyst`: Read-only access to maps and logs, full AI interaction.
- **Tenancy:** Strict logical isolation using `organization_id` on all database records.

### Network Discovery Logic (Python Engine)
The core scanner will implement a multi-stage discovery process:
1.  **Ping/ARP Sweep:** Fast L2/L3 discovery to identify active IP/MAC addresses.
2.  **Service Fingerprinting:** Port scanning critical ports (22, 80, 443, 3389) to identify OS and Role (Server, Printer, IoT).
3.  **Topology Inference:** Using traceroute TTLs and MAC address tables (via SNMP if credentials provided) to infer logical links.

### AI Orchestration Layer
- **Model Agnostic Wrapper:** Design to swap between GPT-4o, Claude 3.5 Sonnet, or local LLMs (Ollama) for privacy.
- **Context Window Management:** Summarize logs before feeding them to the AI to prevent token overflow.
- **Tools:** The AI will have function calls enabled:
    - `get_device_details(ip)`
    - `search_logs(query, time_range)`
    - `highlight_node(node_id)` (Triggers UI action)

---

## 4. Frontend & Dashboard Design (Premium UI/UX)

The aesthetic goal is **"Tactical Glass"**. Dark, sleek, with functional neon accents.

### Design System
- **Color Palette (Dark Mode Default):**
    - **Background:** `#0B0F19` (Deep Void) to `#111827` (Charcoal)
    - **Primary Brand:** `#3B82F6` (Electric Blue) - Active states.
    - **Success/Safe:** `#10B981` (Emerald Neon) - Online devices.
    - **Warning:** `#F59E0B` (Amber Glow) - High latency / Vulnerable.
    - **Danger:** `#EF4444` (Crimson Laser) - Offline / Breach detected.
    - **AI/Magic:** `#8B5CF6` (Violet Plasma) - AI suggestions/actions.
- **Typography:**
    - **Headings:** `Inter` (Clean, geometric).
    - **Data/Logs:** `JetBrains Mono` (High legibility for IPs and JSON).
- **Glassmorphism:**
    - Panels have `backdrop-filter: blur(12px)` and thin borders `border-white/10`.

### Core Views

#### 1. Login / Onboarding
- **Visual:** Minimal centered card on a subtle animated network mesh background.
- **Action:** SSO (Google/GitHub) or Email Magic Link.

#### 2. The Command Center (Dashboard)
- **Layout:** Bento-grid style layout.
- **Widgets:**
    - *Network Health Score* (Radial gauge).
    - *Active Alerts* (Scrolling ticker).
    - *Recent Device Discovery* (List with mini-icons).
    - *Mini-Topology* (Click to expand).

#### 3. Topology Graph View (The "Hero" Feature)
- **Tech:** React Flow.
- **Visuals:**
    - Nodes are "Cards" containing Icon, IP, and Risk Badge.
    - Edges are animated particles flowing in the direction of traffic.
- **Interactions:**
    - **Hover:** Dim all non-connected nodes (Focus Mode).
    - **Right-Click:** Context menu (Scan Node, View Logs, Ask AI).
    - **Filtering:** "Show only IoT devices", "Show only High Risk".

#### 4. AI Assistant Panel ("Sentinel")
- **Behavior:** Slide-out drawer or persistent sidebar.
- **UX:** Chat interface interlaced with "Rich UI Responses".
    - *User:* "Show me all Windows servers with high traffic."
    - *AI:* "I found 3 devices matching criteria. [Renders clickable list in chat]. I've also highlighted them on the graph."

---

## 5. Data Models (Schema Strategy)

**User**
- id, email, role, org_id

**Device (Node)**
- id, org_id, ip_address, mac_address, hostname, os_type, role (router, pc, server), risk_score, last_seen

**Relationship (Edge)**
- source_device_id, target_device_id, protocol (tcp/udp), port, last_detected

**LogEntry**
- id, device_id, timestamp, severity, raw_content, embedding (vector)

---

## 6. User Flow

**"The First 5 Minutes"**
1. User logs in. Dashboard is empty but inviting.
2. Distinct "Start Discovery" button pulses gently.
3. User clicks > Modal asks for "IP Range" (defaulting to local subnet detection of the browser user if possible, or asking for input like 192.168.1.0/24).
4. **Loading State:** A beautiful, terminal-like progress bar shows "Arping... Scanning ports... Analyzing topology...".
5. **Success:** The graph explodes onto the screen, nodes popping in with spring animations.
6. **Engagement:** The AI Chat pops a toast: "I noticed 3 unknown devices. Want me to classify them?"

---

## 7. AI Integration Strategy

**Prompt Engineering for Topology:**
We will inject a compressed JSON representation of the graph into the system prompt:
*"You are Sentinel, a Network SecOps AI. You have access to the current graph state provided in context. When asked about devices, use the graph data first. If unsure, suggest running a deeper scan."*

**RAG for Logs:**
When a user asks "Why did SERVER-A fail?", we:
1. Embed the query.
2. Search Vector DB for logs associated with SERVER-A in the last hour.
3. Retrieve top 20 log lines.
4. Pass lines to LLM to summarize and find root cause.

---

## 8. MVP vs Roadmap

**MVP (Phase 1):**
- Manual IP Range input for scanning.
- Basic ICMP/ARP discovery.
- Visualization of flat topology.
- Manual Log Upload (CSV/Syslog).
- Basic RAG Q&A.

**Phase 2 (Polish):**
- Real-time passive listening (pcap).
- SNMP deep dive.
- Automated scheduled scans.
- Team collaboration (shared comments on graph).
