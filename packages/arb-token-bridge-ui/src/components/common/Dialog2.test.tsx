import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDialog2 } from './Dialog2';

describe('useDialog2', () => {
  it('closes the open dialog', () => {
    const { result } = renderHook(() => useDialog2());

    act(() => {
      result.current[1]('destination_token_selection');
    });
    act(() => {
      result.current[0].onClose(false);
    });

    expect(result.current[0].openedDialogType).toBeNull();
  });

  it('keeps a reopened dialog open when the previous close lands late', () => {
    const { result } = renderHook(() => useDialog2());

    act(() => {
      result.current[1]('destination_token_selection');
    });
    const lateClose = result.current[0].onClose;

    act(() => {
      result.current[1]('destination_token_selection');
    });
    act(() => {
      lateClose(false);
    });

    expect(result.current[0].openedDialogType).toBe('destination_token_selection');
  });
});
