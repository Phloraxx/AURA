# AURA — Full Feature Demo Narration

Target duration: approximately 9–11 minutes.
The video itself is silent and contains no added captions. Read this script as
your own voiceover and adjust pauses during editing.

## 0:00–0:35 — Problem statement

The web is built for everyone, but it is usually presented in exactly the same
way to everyone.

That creates very different barriers for different people. Text may be
difficult to read. Controls may be hard to select. Motion, clutter, unfamiliar
language, or a long sequence of steps can make an ordinary task exhausting.
And these needs rarely appear alone. They overlap, change with context, and do
not fit neatly into one disability mode.

Most accessibility tools begin with a preset. AURA begins with the person.

## 0:35–0:55 — Introduce AURA

AURA is a personalized accessibility browser. It learns how a person
comfortably perceives, understands, and interacts with the web, and then adapts
real webpages around that person and their current goal.

It does not diagnose anyone. It asks about everyday web experiences and stores
the resulting support profile locally on this Mac.

## 0:55–2:35 — Complete Learn Me OOBE

The first experience is Learn Me.

The AURA Guide asks one short question at a time. The interview is
AI-personalized, but it is bounded by a trusted question set, so it remains
useful if the cloud is unavailable and it always covers the six functional
areas that matter to web use.

Those areas are visual support, auditory support, motor and precision support,
cognitive and executive support, attention and sensory-load support, and
language and comprehension support.

The questions are deliberately functional. AURA asks whether ordinary text is
comfortable, whether small controls are difficult to select, whether audio
needs a visual alternative, whether motion and competing regions make focus
harder, whether multi-step tasks are difficult to recover, and whether long or
unfamiliar language needs support.

The answers can overlap. They can be changed later. They never become a medical
label.

Notice that AURA’s own interface responds to the answers. Text, spacing,
control size, information density, motion, and explanation style are resolved
from the same profile that will later adapt websites.

There is also a comfortable-defaults path for someone who wants to begin
immediately.

## 2:35–3:00 — Profile summary and browser shell

At the end, AURA explains the combination it learned in plain language.

The profile is editable, resettable, and persistent. It is not a numeric
disability dashboard.

Now we enter the browser. The shell stays intentionally small: navigation,
address and search, the current page, and one AURA panel. The website remains
the main visual surface.

## 3:00–4:10 — Scan the original Wikipedia page

Before changing the page, I will scan it.

AURA keeps two different ideas separate.

First, it reports factual automated WCAG 2.2 A and AA evidence: which checks
passed, which failed, how many locations are affected, the severity, and what
still needs human review. Automated testing is evidence, not certification, so
AURA never calls this a WCAG compliance percentage.

Second, AURA Fit explains how this page is likely to work for this particular
profile. It is a transparent heuristic out of one hundred across interaction,
visual comfort, focus, understanding, and task simplicity.

Here the original page scores poorly for this person. The panel explains why:
many controls are below their comfortable target size, text is below their
reading target, and a large number of useful elements compete for attention.

The profile changes the relevance and comfort explanation. It never changes
the factual WCAG results.

## 4:10–5:35 — Make This Mine and the three-pass implementation

Now I choose Make This Mine.

The first pass is deterministic and immediate. Trusted AURA code applies the
person’s known presentation needs without waiting for a model.

The second pass runs privately on this Mac with the local Qwen model. It uses a
ranked page model—not the raw DOM—to choose and prioritize real page targets.

The third pass uses GPT-5.6 Luna for deeper page meaning. It can understand the
purpose of the page, important facts, likely primary actions, complex regions,
and the user’s current goal.

Both models return typed, schema-validated plans. They never generate
executable JavaScript, CSS, or replacement HTML.

The visible result is an AURA Recompose interface. The original website remains
loaded underneath with its real controls and state, but the presentation is
reshaped around the person.

After the transformation settles, AURA automatically scans the adapted
presentation. We can see the improved AURA Fit, what support caused that
improvement, which automated issues were resolved, which remain, and whether
anything new was introduced.

## 5:35–6:30 — Multiple personalized presentations

The same website can become a different interface for a different combination
of needs.

Clear and Calm reduces simultaneous choices and gives the page a quieter
hierarchy.

Easier to See produces larger, reflowed content and stronger visual separation.

Easy to Control uses large explicit targets and generous spacing for lower
precision interaction.

Step by Step reveals one clear stage at a time and connects guidance to the
original page controls.

My Profile returns to the combination learned during onboarding.

These are demonstration profiles, not diagnostic disability modes.

## 6:30–7:45 — Talk to AURA

The third primary experience is Talk to AURA.

This is not a generic chatbot describing a webpage. Conversation changes or
guides the real interface.

If I say, “Make the text and controls much bigger,” AURA changes the current
presentation.

If I ask, “Explain this page,” AURA provides a concise explanation grounded in
the current page and this person’s preferred level of detail.

If I say, “Show me the search,” or give AURA a goal, it identifies the relevant
real control, brings it forward, and can guide the task without activating
consequential actions on the user’s behalf.

The same pipeline accepts typed input or push-to-talk dictation.

Short optional spoken replies use Apple’s installed native system voices. The
person can preview a voice, select it, turn read-aloud on or off, and interrupt
speech at any time. Voice is never the only feedback channel.

## 7:45–8:15 — Explicit memory

When I say, “Remember that I prefer calm pages,” AURA asks for confirmation.

Only explicit confirmation creates persistent preference memory. AURA does not
silently infer a permanent disability from behaviour.

The person can inspect what AURA remembers, edit it, forget individual
preferences, or reset the profile.

Session goals can continue across related navigation, while permanent memory
remains under the person’s control.

## 8:15–9:40 — Second website: Fiverr marketplace

Now I will try a completely different page: Fiverr.

A marketplace has a different structure from an article. It contains search,
navigation, repeated service listings, categories, prices, seller information,
recommendations, and many competing actions.

First, AURA scans the original page and explains its standards evidence and
profile-specific barriers.

Then Make This Mine uses the same three-pass pipeline. The deterministic pass
responds immediately. The local planner identifies the listing structure and
real targets. The cloud planner adds deeper intent and meaning.

Instead of lightly restyling the original grid, AURA can recompose the
marketplace into a clearer listing experience while preserving the real Fiverr
actions underneath.

I can then say, “I want to hire a logo designer. Show me the most relevant
search and results.”

AURA changes the visible hierarchy around that goal. It can highlight the real
search field, reduce unrelated competition, and guide the user toward the
relevant controls.

Switching between Clear and Calm, Easy to Control, and Step by Step proves that
the same Fiverr page is not receiving one generic accessibility skin.

## 9:40–10:15 — Reversibility and trust

At any time, Original restores the source website immediately, without a page
reload and without discarding the underlying page state.

The in-page “Show on original page” control and the browser’s Original–AURA
switch stay synchronized.

Back, forward, refresh, address navigation, panel collapse, and window resizing
continue to behave like an ordinary browser.

## 10:15–10:45 — Closing

AURA does not replace accessible web design, and it does not claim that
automated testing proves WCAG conformance.

It adds a personal, explainable, reversible layer between the person and the
web.

It learns the person, understands the page, adapts the experience, responds to
the person’s goal, and remembers only what the person chooses to teach it.

Because there is no single accessible interface.

The web should adapt to the person.
