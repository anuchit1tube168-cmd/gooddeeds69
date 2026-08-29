# RTAFNC ONE Knowledge Registry

## Purpose
ทะเบียนกลางของคู่มือ คำสั่ง ระเบียบ สวัสดิการ แบบธรรมเนียมทหาร และสื่อการเรียนรู้ที่เผยแพร่ผ่าน RTAFNC ONE Library

## Source hierarchy
1. Google Drive = Source of Truth / file master
2. Knowledge Registry = metadata + audience + version + owner
3. NotebookLM = curated study/reasoning workspace
4. RTAFNC Library = published user-facing knowledge
5. AGIS + MCP = search, summarize, and take allowed actions

## Core fields
- knowledge_id
- title
- category
- description
- source_type: DRIVE | NOTEBOOKLM | YOUTUBE | WEB | INTERNAL
- drive_file_id
- notebook_url
- youtube_url
- version
- academic_year
- effective_date
- owner_rtafnc_id
- audience: STUDENT | ADVISOR | GOVERNANCE | PERSONNEL | HEALTH_AUTHORIZED | ALL
- classification: PUBLIC_INTERNAL | INTERNAL | RESTRICTED | SENSITIVE
- status: DRAFT | PUBLISHED | ARCHIVED
- tags[]
- last_reviewed_at
- next_review_at

## Categories
- STUDENT
- GOVERNANCE
- ADVISOR
- WELFARE
- PERSONNEL
- MILITARY
- HEALTH_GENERAL
- ACTIVITY
- SCHOLARSHIP
- LEARNING

## Rules
- ห้ามใช้ NotebookLM เป็นฐาน Transaction หรือ Master Database
- ห้ามทำ Public Notebook สำหรับข้อมูลสุขภาพ เวชระเบียน กำลังพลเฉพาะบุคคล การให้คำปรึกษา หรือข้อมูลสวัสดิการรายบุคคล
- AGIS ต้องตอบจากแหล่งที่ผู้ใช้มีสิทธิ์เข้าถึง และต้องแสดง source/version เมื่อทำงาน Production
- เอกสารที่ถูกแทนที่ต้องเปลี่ยนเป็น ARCHIVED ไม่ลบประวัติ
- Google Drive file ID เป็นตัวอ้างอิงหลักของไฟล์ ไม่ใช้ชื่อไฟล์เป็น key
- เอกสารทุกชิ้นต้องมี owner และ audience

## Phase 1 deliverables
- `rtafnc-one-pilot/library.html`
- Library categories and search UI
- AGIS question placeholder
- Knowledge Registry specification
- Shared official RTAFNC branding

## Phase 2
- Drive inventory adapter
- Registry dataset
- permission-aware search
- NotebookLM link registry
- source/version display

## Phase 3
- AGIS knowledge agent
- MCP tool `library.search`
- MCP tool `library.get_document`
- MCP tool `library.list_updates`
- Telegram/LINE answer handoff where allowed
