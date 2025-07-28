// focusTracker.module.js
export class FocusTracker {
  /**
   * @param {(hasFocus: boolean) => void} onChange
   */
  constructor(onChange) {
    console.log('FocusTracker constructor');
    this.onChange = onChange;
    this._focused = undefined;
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onFocus = this._onFocus.bind(this);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('focus', this._onFocus);
    this._setFocused(!document.hidden);
  }

  get focused() {
    return this._focused;
  }

  _onVisibilityChange() {
    console.log('FocusTracker _onVisibilityChange');
    if (document.hidden) {
      this._setFocused(false);
    } else {
      this._setFocused(true);
    }
  }

  _onBlur() {
    this._setFocused(false);
  }

  _onFocus() {
    this._setFocused(true);
  }

  _setFocused(value) {
    const oldValue = this._focused;
    console.log('FocusTracker _setFocused', 'old =', oldValue, '; new =', value);
    if (oldValue === value) return;
    this._focused = value;
    try {
      this.onChange(value);
    } catch (e) {
      console.error("FocusTracker callback error:", e);
    }
  }

  dispose() {
    console.log('FocusTracker dispose');
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('focus', this._onFocus);
  }
}
