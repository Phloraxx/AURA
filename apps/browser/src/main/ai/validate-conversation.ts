import {
  conversationTurnResponseSchema,
  type ConversationTurnResponse,
} from '../../shared/conversation';
import type { PageElement, PageModel } from '../../shared/page-model';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function canGuide(element: PageElement): boolean {
  return (
    element.interactive ||
    element.category === 'heading' ||
    element.category === 'form'
  );
}

export function validateConversationTurn(
  untrustedResponse: ConversationTurnResponse,
  page: PageModel,
): ConversationTurnResponse {
  const response = conversationTurnResponseSchema.parse(untrustedResponse);
  const elements = new Map(
    page.elements.map((element) => [element.auraId, element]),
  );
  const patch =
    response.adaptationPatch === null
      ? null
      : {
          deemphasizeTargetIds: unique(
            response.adaptationPatch.deemphasizeTargetIds.filter((id) => {
              const element = elements.get(id);
              return (
                element !== undefined &&
                !element.interactive &&
                element.category !== 'form'
              );
            }),
          ),
          guide:
            response.adaptationPatch.guide === null
              ? null
              : {
                  steps: response.adaptationPatch.guide.steps.filter((step) => {
                    const element = elements.get(step.auraId);
                    return element !== undefined && canGuide(element);
                  }),
                  title: response.adaptationPatch.guide.title,
                },
          highlightTargetIds: unique(
            response.adaptationPatch.highlightTargetIds.filter((id) =>
              elements.has(id),
            ),
          ),
          primaryTargetIds: unique(
            response.adaptationPatch.primaryTargetIds.filter((id) =>
              elements.has(id),
            ),
          ),
        };
  if (patch?.guide?.steps.length === 0) patch.guide = null;
  const explanation =
    response.explanation?.targetAuraId !== null &&
    response.explanation !== null &&
    !elements.has(response.explanation.targetAuraId)
      ? { ...response.explanation, targetAuraId: null }
      : response.explanation;

  return conversationTurnResponseSchema.parse({
    ...response,
    adaptationPatch: patch,
    explanation,
  });
}
