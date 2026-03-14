import { useState, useCallback, useRef } from 'react';
import type { VariableType, VariableDefinition } from '@legalcode/shared';
import {
  parseFrontmatter,
  serializeFrontmatter,
  extractVariables,
  updateVariables,
  generateVariableId,
} from '../editor/variableUtils.js';

export interface UseTemplateVariablesReturn {
  variables: VariableDefinition[];
  addVariable: (name: string, type: VariableType, customType?: string) => VariableDefinition;
  renameVariable: (id: string, newName: string) => void;
  retypeVariable: (id: string, newType: VariableType, customType?: string) => void;
  deleteVariable: (id: string) => void;
  getVariableById: (id: string) => VariableDefinition | undefined;
  stripFrontmatter: (markdown: string) => { body: string; variables: VariableDefinition[] };
  injectFrontmatter: (body: string) => string;
}

export function useTemplateVariables(): UseTemplateVariablesReturn {
  const [variables, setVariables] = useState<VariableDefinition[]>([]);

  // Stores the full parsed frontmatter object so non-variable fields are preserved.
  const frontmatterRef = useRef<Record<string, unknown> | null>(null);

  const addVariable = useCallback(
    (name: string, type: VariableType, customType?: string): VariableDefinition => {
      const id = generateVariableId(name);
      const definition: VariableDefinition =
        type === 'custom' && customType !== undefined
          ? { id, name, type, customType }
          : { id, name, type };

      setVariables((prev) => [...prev, definition]);
      return definition;
    },
    [],
  );

  const renameVariable = useCallback((id: string, newName: string): void => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, name: newName } : v)));
  }, []);

  const retypeVariable = useCallback(
    (id: string, newType: VariableType, customType?: string): void => {
      setVariables((prev) =>
        prev.map((v) => {
          if (v.id !== id) return v;
          if (newType === 'custom' && customType !== undefined) {
            return { id: v.id, name: v.name, type: newType, customType };
          }
          // Predefined type — strip customType entirely
          return { id: v.id, name: v.name, type: newType };
        }),
      );
    },
    [],
  );

  const deleteVariable = useCallback((id: string): void => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const getVariableById = useCallback(
    (id: string): VariableDefinition | undefined => {
      return variables.find((v) => v.id === id);
    },
    [variables],
  );

  const stripFrontmatter = useCallback(
    (markdown: string): { body: string; variables: VariableDefinition[] } => {
      const parsed = parseFrontmatter(markdown);
      frontmatterRef.current = parsed.frontmatter;
      const extracted = extractVariables(parsed.frontmatter);
      setVariables(extracted);
      return { body: parsed.body, variables: extracted };
    },
    [],
  );

  const injectFrontmatter = useCallback(
    (body: string): string => {
      // Access variables via a ref-captured pattern isn't possible directly;
      // we use a functional read from the closure. But since injectFrontmatter
      // is memoized with useCallback, we need variables in deps to stay current.
      // However the task spec says to store variables in state — we capture it
      // here. This function is redefined whenever variables changes.
      const storedFrontmatter = frontmatterRef.current;

      // When there are no variables AND no other frontmatter fields, return body as-is.
      if (variables.length === 0 && storedFrontmatter === null) {
        return body;
      }

      // Check if the only content would be an empty variables array with no
      // other frontmatter keys.
      if (variables.length === 0) {
        const hasOtherKeys =
          storedFrontmatter !== null &&
          Object.keys(storedFrontmatter).filter((k) => k !== 'variables').length > 0;
        if (!hasOtherKeys) {
          return body;
        }
      }

      const updatedFrontmatter = updateVariables(storedFrontmatter, variables);
      return serializeFrontmatter(updatedFrontmatter, body);
    },
    [variables],
  );

  return {
    variables,
    addVariable,
    renameVariable,
    retypeVariable,
    deleteVariable,
    getVariableById,
    stripFrontmatter,
    injectFrontmatter,
  };
}
