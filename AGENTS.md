<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AppSec Directives (Senior Application Security)
1. **Prevención por Diseño**: Código defensivo, validación estricta de esquemas, sanitización contra XSS (CWE-79), prevención de ReDoS (sin `new RegExp` dinámicos), cero secretos en cliente y `minimumReleaseAge = 604800` en `bunfig.toml`.
2. **Auto-Validación Continua**: Ejecutar autónomamente `semgrep scan --config auto --config .semgrep.yml` antes de terminar tareas y preparar commits.
3. **Resolución Proactiva**: Tratar todos los findings de Snyk y Semgrep con prioridad máxima; iterar hasta lograr 0 findings.
4. **CI/CD Seguro**: Mantener flujos de trabajo de GitHub Actions pineados a commit SHAs inmutables.
