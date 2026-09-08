# Learning-focused review

The original app was strongest at the first part of learning: implementing a clearly specified small function and getting fast test feedback. It was weaker at retention, choosing a good test, investigating existing code, and explaining a decision. Those weaknesses matter when the goal is independent engineering work.

| Finding                                                                         | Change now implemented                                                                 | What the app can verify                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A passing exercise looked like sufficient evidence of competence                | Separate counts for passed code, written reasoning, and later fresh-code recall        | Test results and note presence; not the quality of reasoning                   |
| References appeared before the learner needed to explain their own approach     | Review prompts appear first; reference comparison is explicitly revealed               | Notes persist; explanations need learner or human review                       |
| No systematic return to previously completed work                               | A recall queue with separate starter-code drafts and expanding intervals               | Due sessions pass the exercise tests without opening in-app help               |
| Most work was implementing a small function from a blank starter                | Six runnable labs start with credible bugs or insufficient checks                      | Correct references pass; buggy starters fail; the learner must repair behavior |
| Hint penalties, speed, and fewer lines could reward counterproductive shortcuts | Free hints; no speed or line-count rewards; explicit evidence for refactor recognition | Activity and recorded evidence, not automatic maintainability scoring          |
| The curriculum path did not explain what broader engineering ownership involves | Three progression stages and four concrete real-repository assignments                 | Saved evidence only; real collaboration and feedback require people            |

## How to use it

Start with **Growth plan**. If you are still building confidence with functions and arrays, follow the core tickets first. For each ticket, predict one failure, make a small attempt, and inspect the first failing test. Use a hint once you can explain where you are stuck.

When tests pass, write three short notes: why the implementation works, a concrete test and the bug it prevents, and one trade-off. Then compare the reference. Keep your version if its behavior and trade-offs are defensible; code resembling the reference is not the goal.

On later days, use the recall queue. It opens fresh starter code while preserving your normal work. The default intervals are 1, 3, 7, and 21 days after qualifying practice. Early practice is allowed but does not advance the schedule. Ending recall lets you consult your previous code and notes without pretending that help was an independent recall pass.

Use the engineering labs to bridge from syntax to feature ownership. They cover diagnosing shared references, designing regression assertions against faulty implementations, bounded retries, stale-response races, duplicate command handling, and controlled parallelism. Each lab also asks what its isolated tests leave unproven in a production system.

Use the four transfer briefs in a real repository to practice design decisions, feature delivery, incident investigation, and constructive review. Save the artifact and the feedback that changed your approach. The app exports your notes as a Markdown learning record you can discuss with a mentor or reviewer.

## Basis and limits

The progression is a product design informed by the distinction between implementing a task and taking broader technical responsibility. GitLab's public senior framework includes technical judgment, communication, collaboration, and helping others grow. It is one company's framework, not a universal promotion checklist. [GitLab senior engineering framework](https://handbook.gitlab.com/handbook/engineering/careers/matrix/senior/).

The recall feature follows the general principle of retrieving knowledge repeatedly across time. The specific 1/3/7/21 schedule is deliberately simple and has not been validated as optimal for this curriculum or for an individual learner. [Retrieval Practice spacing guide](https://www.retrievalpractice.org/spacing/).

This release offers 25 playable exercises and meaningful practice toward independent feature ownership. The full TypeScript, backend, security, and deployment curriculum is still upcoming. Senior-level growth additionally requires sustained delivery, production experience, and feedback from other engineers. No badge, essay counter, or sandbox test suite substitutes for that evidence.
