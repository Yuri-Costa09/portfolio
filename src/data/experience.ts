// The home "experience" section. Newest job first.
// Bullets read best as: what you did, at what scale, with what result.

export interface Job {
  role: string;
  org: string;
  start: string; // 'YYYY-MM'
  end?: string; // 'YYYY-MM'; leave out for your current job
  bullets: string[];
}

export const experience: Job[] = [
  {
    role: 'Software Engineer',
    org: 'Mercado Livre (Mercado Pago)',
    start: '2026-04',
    bullets: [
      'Clearing and settlement at Mercado Pago, one of Latin America’s largest payment acquirers (US$ 100B+ in payment volume per quarter).',
      'Built a Visa simulator for E2E testing: certification cycles went from ~24 hours to a few minutes (>99% less). Adopted by all 5 clearing teams (~50 engineers) and used to certify 3+ business initiatives.',
      'Go and Java microservices with hexagonal and clean architecture, backed by E2E test suites, guarding transaction integrity on critical flows.',
      'Circuit breakers, rate limiting and idempotency guarantees against cascading failures and duplicate transactions. Owned mission-critical production releases.',
      'On call for clearing and settlement: production incidents traced to root cause with Datadog (APM, tracing, logs, monitors) and Grafana.',
    ],
  },
  {
    role: 'Software Engineer',
    org: 'KG Sorensen',
    start: '2025-09',
    end: '2026-04',
    bullets: [
      'Led end-to-end development of KG CALL, an in-house CRM (Java 21, Spring Boot, JPA, clean architecture), saving R$ 36,000 a year.',
      'Observability with Prometheus, Grafana and Micrometer (p95/p99, Slack alerts). Keycloak IAM with RBAC across Spring Security and React (PKCE).',
      'Tested with JUnit 5, Mockito and BDD. Shipped to AWS (ECS, RDS PostgreSQL, S3) through GitHub Actions CI/CD.',
    ],
  },
  {
    role: 'Full Stack Developer',
    org: 'Clear Cloud Software',
    start: '2023-11',
    end: '2025-08',
    bullets: [
      'Part-time, remote: custom backend and web systems for international clients.',
      'Caching for the mobile product listing: ~275 ms down to ~7 ms (~40× faster).',
      'REST APIs in Spring Boot and Ruby on Rails, shipped as Docker containers on AWS EC2 behind Nginx with Certbot TLS.',
    ],
  },
];
