import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders correctly', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('PartnerSpace');
    expect(wrapper.text()).toContain('Budget');
  });

  it('changes view when nav item clicked', async () => {
    const wrapper = mount(App);

    // Find nav button for Plans
    const plansBtn = wrapper.findAll('button').find(b => b.text().includes('Plans'));
    await plansBtn?.trigger('click');

    expect(wrapper.text()).toContain('Goals');
  });
});
