# Function Tree — ToBe-KK

A call-oriented map of the codebase: which function calls which, from a click in
the browser down to a Mongoose query. Companion to [architecture.md](architecture.md),
which maps *modules*; this document maps *functions*.

Small anonymous callbacks (`.map()`, `.filter()`, inline `onClick`, `useEffect`
bodies, promise `.then()` chains) are excluded. Named inner helpers and named
handlers are included, because they are the actual units of behaviour.

**Layering note:** there is no separate repository layer. Mongoose models are the
data-access layer, and controllers call them directly (`Event.find()`,
`Registrant.findByIdAndUpdate()`). Likewise, the client has no Redux-style store:
the per-feature `*Service.js` modules are the API layer, and every one of them
funnels through a single `apiRequest()`.

---

## 1. Whole-stack call path

```mermaid
flowchart LR
    U(["User / Admin"])

    subgraph CLIENT["React Client"]
        direction TB
        PAGE["Page component<br/>Events · Jobs · Home · Schedule …"]
        HANDLER["Named handler<br/>handleCreate · handleDelete · loadEvents"]
        SVC["Service function<br/>createEvent · listJobs · login"]
        API["apiRequest<br/>services/apiClient.js"]
        PAGE --> HANDLER --> SVC --> API
    end

    subgraph SERVER["Express API"]
        direction TB
        MW["Global middleware<br/>helmet · cors · express.json<br/>cookieParser · no-store"]
        RL["rateLimit<br/>login · register · apply"]
        AUTH["requireAuth<br/>auth.middleware.js"]
        UPL["upload.single photo<br/>→ toCloudinary"]
        CTRL["Controller function<br/>createEvent · listJobs · getSummary"]
        MODEL["Mongoose model<br/>Event · Job · Registrant …"]
        MW --> RL --> AUTH --> UPL --> CTRL --> MODEL
    end

    DB[("MongoDB")]
    CDN[("Cloudinary")]

    U --> PAGE
    API == "fetch · credentials include" ==> MW
    MODEL --> DB
    UPL --> CDN

    classDef cl fill:#eef4ff,stroke:#2b5fd9,color:#10224d
    classDef sv fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    classDef ext fill:#fdf6e3,stroke:#b7791f,color:#4a3208
    class PAGE,HANDLER,SVC,API cl
    class MW,RL,AUTH,UPL,CTRL,MODEL sv
    class DB,CDN,U ext
```

---

## 2. Client — app shell and routing

```mermaid
flowchart TB
    MAIN["main.jsx<br/>createRoot · render"]
    BR["BrowserRouter"]
    ASP["AdminSessionProvider<br/>refresh · markAuthed · clearSession"]
    ACP["ActivityProvider<br/>refreshSummary · notifyActivityChanged"]
    APP["App<br/>route tree"]

    MAIN --> BR --> ASP --> ACP --> APP

    LAYOUT["Layout"]
    HEADER["Header"]
    NAVBAR["Navbar<br/>→ HomeIcon"]
    TOPBAR["AdminTopbar<br/>→ handleLogout"]
    BELL["ActivityBell<br/>→ handleClear"]
    BRAND["BrandLogo"]
    THEME["ThemeToggleButton"]

    APP --> LAYOUT
    LAYOUT --> HEADER --> BRAND
    HEADER --> NAVBAR
    LAYOUT --> TOPBAR --> BELL
    HEADER --> THEME

    P1["Home"]
    P2["Events"]
    P3["Scholarships"]
    P4["Jobs"]
    P5["Schedule"]
    P6["Links"]
    P7["Contact"]
    P8["StudentRegistry"]
    P9["AdminActivity"]
    P10["AdminLogin<br/>outside Layout"]
    P11["StyleGuide · PlaceholderPage<br/>NotFound"]

    LAYOUT --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9 & P11
    APP --> P10

    classDef boot fill:#eef4ff,stroke:#2b5fd9,color:#10224d
    classDef chrome fill:#e9f7fb,stroke:#1c7e96,color:#082b34
    classDef page fill:#f5eefc,stroke:#7b3fa0,color:#2e1240
    class MAIN,BR,ASP,ACP,APP boot
    class LAYOUT,HEADER,NAVBAR,TOPBAR,BELL,BRAND,THEME chrome
    class P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11 page
```

---

## 3. Client — page handlers → service functions

The content pages (Events, Jobs, Scholarships) share one shape: a loader pair,
three CRUD handlers, and filter helpers. Events is shown in full; Jobs and
Scholarships are structurally identical.

```mermaid
flowchart LR
    subgraph EV["Events"]
        direction TB
        E_LOAD["loadEvents"]
        E_LF["loadFields"]
        E_C["handleCreate"]
        E_U["handleUpdate"]
        E_D["handleDelete"]
        E_TO["toggleOption"]
        E_CF["clearFilters"]
        E_HELP["fieldSelectionsToFieldValues"]
    end

    subgraph EVSVC["EventsService.js"]
        direction TB
        S1["listEvents"]
        S2["createEvent"]
        S3["updateEvent"]
        S4["deleteEvent"]
        S5["registerForEvent"]
        S6["listRegistrations"]
        S7["updateRegistrationStatus"]
        S8["deleteRegistration"]
    end

    subgraph EFSVC["EventFieldsService.js"]
        direction TB
        F1["listEventFields"]
        F2["createEventField"]
        F3["renameEventField"]
        F4["deleteEventField"]
        F5["addEventFieldOption"]
        F6["deleteEventFieldOption"]
    end

    subgraph CHILD["Child components"]
        direction TB
        C1["EventCard<br/>registrationsApi memo"]
        C2["EventForm<br/>handleChange · toggleFieldOption<br/>handleSubmit"]
        C3["FilterSidebar<br/>→ FilterFieldGroup"]
        C4["SortBar"]
        C5["FieldsManager<br/>handleAddField · handleRenameField<br/>handleDeleteField · handleAddOption<br/>handleDeleteOption → FieldSection"]
        C6["SubmissionsPanel<br/>load · handleStatusChange<br/>handleDelete · handleAddSubmit<br/>handleExport → TrashIcon"]
    end

    E_LOAD --> S1
    E_C --> S2
    E_U --> S3
    E_D --> S4
    E_LF --> F1
    E_LOAD --> E_HELP
    E_TO --> E_CF

    EV --> C1 & C2 & C3 & C4 & C5
    C1 --> C6
    C5 --> F2 & F3 & F4 & F5 & F6
    C6 --> S5 & S6 & S7 & S8

    API["apiRequest"]
    EVSVC --> API
    EFSVC --> API

    classDef pg fill:#f5eefc,stroke:#7b3fa0,color:#2e1240
    classDef sv fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    classDef wd fill:#e9f7fb,stroke:#1c7e96,color:#082b34
    class E_LOAD,E_LF,E_C,E_U,E_D,E_TO,E_CF,E_HELP pg
    class S1,S2,S3,S4,S5,S6,S7,S8,F1,F2,F3,F4,F5,F6,API sv
    class C1,C2,C3,C4,C5,C6 wd
```

### Same shape, other features

| Page | Loaders | Mutating handlers | Service module |
|---|---|---|---|
| `Jobs` | `loadJobs` · `loadFields` | `handleCreate` · `handleUpdate` · `handleDelete` · `toggleOption` · `clearFilters` | `JobsService` · `JobFieldsService` |
| `Scholarships` | `loadScholarships` · `loadFields` | `handleCreate` · `handleUpdate` · `handleDelete` · `toggleOption` · `clearFilters` | `ScholarshipsService` · `ScholarshipFieldsService` |
| `Home` | `loadHome` · `loadSchedule` | `handleSaveContent` · `handleSaveCaption` · `handleAddPhoto` · `handleDeletePhoto` | `HomeService` · `ScheduleService` |
| `Links` | `loadLinks` | `handleCreateGroup` · `handleRenameGroup` · `handleDeleteGroup` · `handleAddItem` · `handleUpdateItem` · `handleDeleteItem` · `handleGroupDragStart` · `handleGroupDrop` · `handleReorderItems` | `LinksService` |
| `Contact` | `loadContact` | `handleCreateGroup` · `handleRenameGroup` · `handleDeleteGroup` · `handleAddPerson` · `handleUpdatePerson` · `handleDeletePerson` | `ContactService` |
| `Schedule` | `loadEntries` · `loadCategories` | `handleCreate` · `handleUpdate` · `handleDelete` · `handleSelectManual` · `toggleFilterKey` · `filterKeyFor` | `ScheduleService` |
| `StudentRegistry` | `loadOptions` | delegated to `RegistrantsPanel` / `ListOptionsManager` | `RegistryService` · `RegistryOptionsService` |
| `AdminActivity` | context `refreshSummary` | `handleClear` → `clear` · `handleToggleFlag` → `applyTo` · `isExpanded` · `toggle` | `ActivityService` |
| `AdminLogin` | — | `handleSubmit` | `UsersService` |

---

## 4. Client — heavier feature internals

```mermaid
flowchart TB
    subgraph SCHED["ScheduleManager"]
        direction TB
        SC["Schedule"]
        CAL["Calendar<br/>handleEntryClick · handlePillClick"]
        CALH["buildMonthGrid · buildDayWindow<br/>buildMonthDays · previewTitle<br/>computeRowLaneAssignments<br/>computeDaySpanningSegments"]
        AG["AgendaList<br/>→ occupiedDayKeys"]
        CM["CategoryManager<br/>startEditing · handleCreate<br/>handleRename · handleDelete<br/>→ SwatchPicker"]
        SEF["ScheduleEntryForm<br/>handleChange · handleSubmit"]
        SE["scheduleEntries.js<br/>toDateKey · dateKeyToDate · dayOnly<br/>isSpanning · buildEntriesByDay · coversDay<br/>entriesOnDay · colorClassFor<br/>splitDeadlineTitle"]
        HKC["useCalendarView<br/>startOfToday · addDays · startOfWeek<br/>addMonthsClamped · anchorForView"]
        SC --> CAL --> CALH
        SC --> AG
        SC --> CM
        SC --> SEF
        CAL --> SE
        AG --> SE
        SC --> HKC
    end

    subgraph REG["RegistryManager"]
        direction TB
        SR["StudentRegistry"]
        RP["RegistrantsPanel<br/>load · handleHeaderClick · startEdit<br/>cancelEdit · commitCell · toggleSelected<br/>toggleSelectAll · handleDeleteSelected<br/>handleExport · renderCell"]
        RPH["formatDateTime · displayValue<br/>searchableText · sortValue<br/>compareSortValues · valuesForChartField<br/>computeCounts"]
        ED["TextCellEditor<br/>ListSelectCellEditor<br/>InterestsCellEditor → toggle"]
        PIE["PieChart"]
        RF["RegistrantForm<br/>handleChange · toggleInterest<br/>handleSubmit → RegistrantFormFields"]
        LOM["ListOptionsManager<br/>addOption · deleteOption<br/>→ OptionChipManager"]
        CONST["constants.js<br/>resolveOptionValue<br/>validateRegistrant<br/>buildRegistrantPayload"]
        SR --> RP --> RPH
        RP --> ED
        RP --> PIE
        SR --> RF --> CONST
        SR --> LOM
    end

    subgraph ACT["ActivityManager"]
        direction TB
        AA["AdminActivity"]
        AAH["relativeTime · summarise<br/>filterGroups → matches"]
        AAC["NodeHeader · EntryRow"]
        AA --> AAH
        AA --> AAC
    end

    subgraph HOMEF["HomeManager"]
        direction TB
        HM["Home"]
        PC["PhotoCarousel<br/>resetTimer · goTo<br/>handleFileChange"]
        HCE["HomeContentEditor<br/>startEditing · handleSubmit"]
        QL["QuickLinks"]
        HM --> PC & HCE & QL
    end

    classDef f fill:#f5eefc,stroke:#7b3fa0,color:#2e1240
    classDef h fill:#fdf6e3,stroke:#b7791f,color:#4a3208
    class SC,CAL,AG,CM,SEF,SR,RP,ED,PIE,RF,LOM,AA,AAC,HM,PC,HCE,QL f
    class CALH,SE,HKC,RPH,CONST,AAH h
```

---

## 5. Client — hooks, shared widgets, utilities

```mermaid
flowchart TB
    subgraph HOOKS["src/hooks"]
        direction TB
        H1["useAdminSession · AdminSessionProvider<br/>refresh · markAuthed · clearSession"]
        H2["useActivity · ActivityProvider<br/>refreshSummary · notifyActivityChanged"]
        H3["useCalendarView<br/>+ 5 date helpers"]
        H4["useTheme<br/>→ getInitialTheme"]
        H5["useIsMobile<br/>→ subscribe · getSnapshot"]
        H6["useScrollToOpenPanel"]
    end

    subgraph WIDGETS["GUIComponents/Widgets"]
        direction TB
        W1["FilterSidebar → FilterFieldGroup"]
        W2["SortBar"]
        W3["FieldsManager → FieldSection<br/>5 handlers"]
        W4["OptionChipManager<br/>handleAdd · handleDelete"]
        W5["SignupForm<br/>handleChange · handleSubmit"]
        W6["SubmissionsPanel<br/>load · handleStatusChange · handleDelete<br/>handleAddSubmit · handleExport"]
        W7["PhotoDropzone"]
        W8["ShareBox → handleCopy"]
        W9["ExportExcelButton → ExcelExportIcon"]
    end

    subgraph UTILS["src/utils"]
        direction TB
        U1["formatDate"]
        U2["previewText"]
        U3["resolvePhotoUrl"]
        U4["exportRowsToExcel"]
        U5["shareText.js<br/>buildEventShareText<br/>buildScholarshipShareText<br/>buildJobShareText<br/>+ formatDate · buildShareUrl · joinLines"]
        U6["sortComparators.js<br/>byDateAsc · byDateDesc<br/>byNumberAsc · byNumberDesc<br/>byTextAsc · chain · dateValue"]
    end

    subgraph SERVICES["API layer"]
        direction TB
        A1["apiRequest<br/>services/apiClient.js"]
        A2["API_URL<br/>config/apiConfig.js"]
        A2 --> A1
    end

    H1 --> A1
    H2 --> A1
    W8 --> U5
    W9 --> U4
    W6 --> U4
    W2 --> U6
    WIDGETS --> U1
    WIDGETS --> U3
    W6 --> A1

    classDef hk fill:#fdf0f5,stroke:#b03a63,color:#3d0f20
    classDef wd fill:#e9f7fb,stroke:#1c7e96,color:#082b34
    classDef ut fill:#fdf6e3,stroke:#b7791f,color:#4a3208
    classDef sv fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    class H1,H2,H3,H4,H5,H6 hk
    class W1,W2,W3,W4,W5,W6,W7,W8,W9 wd
    class U1,U2,U3,U4,U5,U6 ut
    class A1,A2 sv
```

### Service functions by module

| Module | Exported API functions |
|---|---|
| `services/apiClient.js` | `apiRequest(path, { method, body, isFormData, credentials })` |
| `UsersService` | `getCurrentAdmin` · `login` · `logout` |
| `EventsService` | `listEvents` · `createEvent` · `updateEvent` · `deleteEvent` · `registerForEvent` · `listRegistrations` · `updateRegistrationStatus` · `deleteRegistration` |
| `EventFieldsService` | `listEventFields` · `createEventField` · `renameEventField` · `deleteEventField` · `addEventFieldOption` · `deleteEventFieldOption` |
| `JobsService` | `listJobs` · `createJob` · `updateJob` · `deleteJob` · `applyToJob` · `listApplications` · `updateApplicationStatus` · `deleteApplication` |
| `JobFieldsService` | `listJobFields` · `createJobField` · `renameJobField` · `deleteJobField` · `addJobFieldOption` · `deleteJobFieldOption` |
| `ScholarshipsService` | `listScholarships` · `createScholarship` · `updateScholarship` · `deleteScholarship` |
| `ScholarshipFieldsService` | `listScholarshipFields` · `createScholarshipField` · `renameScholarshipField` · `deleteScholarshipField` · `addScholarshipFieldOption` · `deleteScholarshipFieldOption` |
| `ScheduleService` | `getScheduleEntries` · `createScheduleEntry` · `updateScheduleEntry` · `deleteScheduleEntry` · `getScheduleCategories` · `createScheduleCategory` · `renameScheduleCategory` · `deleteScheduleCategory` |
| `HomeService` | `getHome` · `saveHomeContent` · `saveHomeCaption` · `addHomePhoto` · `deleteHomePhoto` |
| `LinksService` | `getLinks` · `createLinkGroup` · `renameLinkGroup` · `deleteLinkGroup` · `createLinkItem` · `updateLinkItem` · `deleteLinkItem` · `reorderLinkGroups` · `reorderLinkItems` |
| `ContactService` | `getContact` · `createContactGroup` · `renameContactGroup` · `deleteContactGroup` · `createContactPerson` · `updateContactPerson` · `deleteContactPerson` |
| `RegistryService` | `listRegistrants` · `createRegistrant` · `updateRegistrant` · `deleteRegistrant` |
| `RegistryOptionsService` | `getRegistryOptions` · `addRegistryOption` · `deleteRegistryOption` |
| `ActivityService` | `getActivitySummary` · `markActivitySeen` · `getActivityStats` · `setActivityFlag` |

---

## 6. Server — bootstrap and middleware chain

```mermaid
flowchart TB
    IDX["src/index.js"]

    subgraph GLOBAL["Global middleware, in order"]
        direction TB
        M1["helmet"]
        M2["morgan dev"]
        M3["cors · origin + credentials true"]
        M4["express.json"]
        M5["cookieParser"]
        M6["no-store Cache-Control"]
        M7["/uploads → CORP cross-origin<br/>+ express.static"]
        M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7
    end

    subgraph MOUNTS["Router mounts"]
        direction TB
        R1["/api/auth · /api/events · /api/event-fields"]
        R2["/api/scholarships · /api/scholarship-fields"]
        R3["/api/jobs · /api/job-fields"]
        R4["/api/student-registry · -options"]
        R5["/api/schedule · /api/home"]
        R6["/api/contact · /api/links · /api/activity"]
    end

    TAIL["GET /api/health<br/>404 JSON fallback"]

    subgraph BOOT["Startup"]
        direction TB
        B1["mongoose.connect"]
        B2["seedListOptions<br/>seedJobFields<br/>seedEventFields"]
        B3["seedAdmin — manual script"]
        B4["app.listen PORT HOST"]
        B5["keep-alive setInterval<br/>→ fetch /api/health"]
        B1 --> B2
        B4 --> B5
    end

    IDX --> GLOBAL --> MOUNTS --> TAIL
    IDX --> BOOT

    subgraph GUARDS["Per-route guards"]
        direction TB
        G1["requireAuth<br/>auth.middleware.js<br/>verifies JWT cookie"]
        G2["rateLimit<br/>loginLimiter · registerLimiter<br/>applyLimiter"]
        G3["upload.single photo<br/>→ toCloudinary"]
    end

    MOUNTS --> GUARDS

    classDef mw fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    classDef bt fill:#eef4ff,stroke:#2b5fd9,color:#10224d
    classDef gd fill:#fdf0f5,stroke:#b03a63,color:#3d0f20
    class M1,M2,M3,M4,M5,M6,M7,R1,R2,R3,R4,R5,R6,TAIL mw
    class IDX,B1,B2,B3,B4,B5 bt
    class G1,G2,G3 gd
```

### Upload pipeline

```mermaid
flowchart LR
    SUB["shared/cloudinaryUpload.js"]
    CU["createUploader folder"]
    UB["uploadBufferToCloudinary buffer folder"]
    PI["publicIdFromUrl url"]
    SUB --> CU & UB & PI
    CU -->|"returns upload + toCloudinary"| TC["toCloudinary middleware"]
    TC --> UB

    E["events/upload.js"] --> CU
    J["jobs/upload.js"] --> CU
    S["scholarships/upload.js"] --> CU
    H["home/upload.js"] --> CU

    TC --> CTRLS["createEvent · updateEvent<br/>createJob · updateJob<br/>createScholarship · updateScholarship<br/>addHomePhoto"]
    CTRLS -.->|"on replace or delete"| PI

    classDef sv fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    class SUB,CU,UB,PI,TC,E,J,S,H,CTRLS sv
```

---

## 7. Server — auth, events, jobs

```mermaid
flowchart LR
    subgraph AUTHF["userManagement"]
        direction TB
        AR["auth.routes.js<br/>POST /login · POST /logout · GET /me"]
        AC["auth.controller.js<br/>login · logout · me<br/>signToken · setAuthCookie"]
        AM["auth.middleware.js<br/>requireAuth"]
        AS["seedAdmin"]
        UM[("User model")]
        AR --> AC --> UM
        AR --> AM
        AS --> UM
    end

    subgraph EVF["events"]
        direction TB
        ER["event.routes.js<br/>GET / · GET /admin · POST /<br/>PATCH /:id · DELETE /:id<br/>POST /:id/register<br/>GET PATCH DELETE /:id/registrations"]
        EC["event.controller.js<br/>listEvents · listEventsAdmin<br/>createEvent · updateEvent · deleteEvent<br/>registerForEvent · listRegistrations<br/>updateRegistrationStatus · deleteRegistration<br/>helper: isRegistrationClosed"]
        EFR["eventField.routes.js"]
        EFC["eventField.controller.js<br/>listEventFields · createField<br/>renameField · deleteField<br/>createFieldOption · deleteFieldOption"]
        ESD["seedEventFields"]
        EM[("Event · Registration<br/>EventField · EventFieldOption")]
        ER --> EC --> EM
        EFR --> EFC --> EM
        ESD --> EM
    end

    subgraph JBF["jobs"]
        direction TB
        JR["job.routes.js<br/>GET / · GET /admin · POST /<br/>PATCH /:id · DELETE /:id<br/>POST /:id/apply<br/>GET PATCH DELETE /:id/applications"]
        JC["job.controller.js<br/>listJobs · listJobsAdmin<br/>createJob · updateJob · deleteJob<br/>applyToJob · listApplications<br/>updateApplicationStatus · deleteApplication<br/>helpers: clearUnusedApplicationFields<br/>optionalTrimmedString"]
        JFR["jobField.routes.js"]
        JFC["jobField.controller.js<br/>listJobFields · createField<br/>renameField · deleteField<br/>createFieldOption · deleteFieldOption"]
        JSD["seedJobFields"]
        JM[("Job · JobApplication<br/>JobField · JobFieldOption")]
        JR --> JC --> JM
        JFR --> JFC --> JM
        JSD --> JM
    end

    AM -.->|"guards admin routes"| ER
    AM -.-> EFR
    AM -.-> JR
    AM -.-> JFR

    classDef rt fill:#eef4ff,stroke:#2b5fd9,color:#10224d
    classDef ct fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    classDef md fill:#fdf6e3,stroke:#b7791f,color:#4a3208
    classDef gd fill:#fdf0f5,stroke:#b03a63,color:#3d0f20
    class AR,ER,EFR,JR,JFR rt
    class AC,EC,EFC,JC,JFC,AS,ESD,JSD ct
    class UM,EM,JM md
    class AM gd
```

---

## 8. Server — scholarships, schedule, home, links, contact, registry, activity

```mermaid
flowchart LR
    subgraph SCH["scholarships"]
        direction TB
        SR2["scholarship.routes.js<br/>GET / · POST / · PATCH /:id · DELETE /:id"]
        SC2["scholarship.controller.js<br/>listScholarships · createScholarship<br/>updateScholarship · deleteScholarship<br/>helper: optionalNonNegativeNumber"]
        SFR["scholarshipField.routes.js"]
        SFC["scholarshipField.controller.js<br/>listScholarshipFields · createField<br/>renameField · deleteField<br/>createFieldOption · deleteFieldOption"]
        SM[("Scholarship · ScholarshipField<br/>ScholarshipFieldOption")]
        SR2 --> SC2 --> SM
        SFR --> SFC --> SM
    end

    subgraph SCD["schedule"]
        direction TB
        SDR["schedule.routes.js<br/>GET POST PATCH DELETE /<br/>GET POST PATCH DELETE /categories"]
        SDC["schedule.controller.js<br/>listSchedule · createScheduleEntry<br/>updateScheduleEntry · deleteScheduleEntry<br/>listCategories · createCategory<br/>updateCategory · deleteCategory"]
        SDM[("ScheduleEntry · ScheduleCategory")]
        SDR --> SDC --> SDM
    end

    subgraph HOM["home"]
        direction TB
        HR["home.routes.js<br/>GET / · PATCH /content<br/>POST /photos · DELETE /photos/:id"]
        HC["home.controller.js<br/>getHome · updateHomeContent<br/>addHomePhoto · deleteHomePhoto"]
        HM2[("HomeContent · HomePhoto")]
        HR --> HC --> HM2
    end

    subgraph LNK["links"]
        direction TB
        LR["link.routes.js<br/>GET / · groups CRUD + reorder<br/>items CRUD + reorder"]
        LC["link.controller.js<br/>listLinks · createGroup · updateGroup<br/>deleteGroup · reorderGroups<br/>createItem · updateItem<br/>deleteItem · reorderItems"]
        LM[("LinkGroup · LinkItem")]
        LR --> LC --> LM
    end

    subgraph CNT["contact"]
        direction TB
        CR["contact.routes.js<br/>GET / · groups CRUD · people CRUD"]
        CC["contact.controller.js<br/>listContact · createGroup<br/>updateGroup · deleteGroup<br/>createPerson · updatePerson<br/>deletePerson"]
        CM2[("ContactGroup · ContactPerson")]
        CR --> CC --> CM2
    end

    subgraph REG2["studentRegistry"]
        direction TB
        RR["registrant.routes.js<br/>POST / · GET / · PATCH /:id · DELETE /:id"]
        RC["registrant.controller.js<br/>createRegistrant · listRegistrants<br/>updateRegistrant · deleteRegistrant"]
        LOR["listOption.routes.js"]
        LOC["listOption.controller.js<br/>listOptions · createOption<br/>deleteOption"]
        LSD["seedListOptions"]
        RM[("Registrant · ListOption")]
        RR --> RC --> RM
        LOR --> LOC --> RM
        LSD --> RM
    end

    subgraph ACT2["activity"]
        direction TB
        ACR["activity.routes.js<br/>GET /summary · POST /seen<br/>GET /stats · PATCH /flag"]
        ACC["activity.controller.js<br/>getSummary · markSeen<br/>getStats · setFlag<br/>helpers: unseenFilter · summarise<br/>groupByParent · byNewestActivity"]
        ACM[("Registration · JobApplication<br/>Registrant — read across features")]
        ACR --> ACC --> ACM
    end

    classDef rt fill:#eef4ff,stroke:#2b5fd9,color:#10224d
    classDef ct fill:#edfaf1,stroke:#1e8449,color:#0d3d22
    classDef md fill:#fdf6e3,stroke:#b7791f,color:#4a3208
    class SR2,SFR,SDR,HR,LR,CR,RR,LOR,ACR rt
    class SC2,SFC,SDC,HC,LC,CC,RC,LOC,LSD,ACC ct
    class SM,SDM,HM2,LM,CM2,RM,ACM md
```

---

## 9. Data-access layer — Mongoose models

22 models, all consumed directly by controllers. Every route group's admin
endpoints sit behind `requireAuth`; public reads (`GET /api/events`,
`GET /api/home`, `GET /api/contact`, `GET /api/links`, `GET /api/schedule`) do not.

| Feature | Models |
|---|---|
| `userManagement` | `User` |
| `events` | `Event` · `Registration` · `EventField` · `EventFieldOption` |
| `jobs` | `Job` · `JobApplication` · `JobField` · `JobFieldOption` |
| `scholarships` | `Scholarship` · `ScholarshipField` · `ScholarshipFieldOption` |
| `schedule` | `ScheduleEntry` · `ScheduleCategory` |
| `home` | `HomeContent` · `HomePhoto` |
| `links` | `LinkGroup` · `LinkItem` |
| `contact` | `ContactGroup` · `ContactPerson` |
| `studentRegistry` | `Registrant` · `ListOption` |

---

## 10. End-to-end trace — an admin creates an event

```mermaid
sequenceDiagram
    actor Admin
    participant EF as EventForm.handleSubmit
    participant EV as Events.handleCreate
    participant SV as EventsService.createEvent
    participant AC as apiRequest
    participant MW as requireAuth
    participant UP as upload + toCloudinary
    participant CT as event.controller.createEvent
    participant DB as Event model
    participant ACT as notifyActivityChanged

    Admin->>EF: submit form
    EF->>EV: onSubmit FormData
    EV->>SV: createEvent formData
    SV->>AC: POST /api/events · isFormData
    AC->>MW: fetch with session cookie
    MW->>UP: JWT valid → next
    UP->>UP: uploadBufferToCloudinary
    UP->>CT: req.body.photoUrl set
    CT->>DB: Event.create
    DB-->>CT: document
    CT-->>AC: 201 success + data
    AC-->>EV: parsed JSON
    EV->>EV: loadEvents
    EV->>ACT: notifyActivityChanged
```

---

## 11. Function count by layer

| Layer | Named functions |
|---|---|
| React page / screen components | 14 |
| React child + widget components | 33 |
| Named handlers and loaders inside components | ~95 |
| Custom hooks (2 of them providers) | 6 + 9 internal helpers |
| Client API service functions | 66 |
| Client utilities and pure helpers | 30 |
| Express controller functions | 61 |
| Middleware and upload helpers | 6 |
| Route registrations | 70 |
| Seeders | 4 |
| Mongoose models | 22 |
