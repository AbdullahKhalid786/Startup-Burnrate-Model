from __future__ import annotations

from runwayos.schemas import Project, Scenario, StartupSnapshot


def apply_scenario(
    startup: StartupSnapshot, projects: list[Project], scenario: Scenario
) -> tuple[StartupSnapshot, list[Project]]:
    startup_modified = startup.model_copy(deep=True)
    startup_modified.monthly_expenses *= scenario.base_expense_multiplier
    startup_modified.monthly_revenue *= scenario.base_revenue_multiplier

    excluded = set(scenario.exclude_project_ids)
    project_list: list[Project] = []
    for project in projects:
        if project.project_id in excluded:
            continue
        adjusted = project.model_copy(deep=True)
        delay = scenario.delay_projects_by_months.get(project.project_id, 0)
        adjusted.start_month += delay
        adjusted.monthly_cost *= scenario.base_expense_multiplier
        project_list.append(adjusted)

    return startup_modified, project_list

