(function () {
	const MARKUP_EMPTY_CSS = '/* 디자인 블록을 추가하면 마크업이 생성됩니다. */';

	function closestElement(target, selector) {
		const element = target?.nodeType === 1 ? target : target?.parentElement;
		return element?.closest(selector) || null;
	}

	function initBuilderHeader() {
		if (document.body.dataset.builderHeaderBound === 'true') return;
		document.body.dataset.builderHeaderBound = 'true';

		const deviceIcons = { pc: 'ri-computer-line', tablet: 'ri-tablet-line', mobile: 'ri-cellphone-line' };
		const menu = document.getElementById('deviceDropdownMenu');
		const iconEl = document.querySelector('.device-dropdown-icon');
		const trigger = document.getElementById('deviceDropdownTrigger');

		trigger?.addEventListener('click', event => {
			event.stopPropagation();
			if (menu) menu.hidden = !menu.hidden;
		});
		document.addEventListener('click', () => {
			if (menu) menu.hidden = true;
		});

		document.getElementById('deviceSwitcher')?.addEventListener('click', event => {
			const btn = closestElement(event.target, '[data-device]');
			if (!btn || !iconEl) return;
			const device = btn.dataset.device;
			iconEl.className = `${deviceIcons[device] || deviceIcons.pc} device-dropdown-icon`;
			if (menu) menu.hidden = true;
		});

		const setExpandButtonState = (button, active) => {
			const icon = button?.querySelector('i');
			const tooltip = button?.querySelector('.builder-expand-tooltip');
			const label = active ? '빌더 원래대로' : '빌더 넓게보기';
			button?.classList.toggle('is-active', active);
			if (icon) icon.className = active ? 'ri-expand-right-fill' : 'ri-expand-left-fill';
			if (tooltip) tooltip.textContent = label;
			button?.setAttribute('aria-label', label);
		};

		const expandBtn = document.getElementById('builderExpandBtn');
		if (expandBtn) {
			const params = new URLSearchParams(window.location.search || '');
			const embeddedCms = window.parent !== window && params.get('popupApply') !== 'Y';
			setExpandButtonState(expandBtn, embeddedCms);
		}
		expandBtn?.addEventListener('click', function () {
			const active = !this.classList.contains('is-active');
			setExpandButtonState(this, active);
			if (window.parent !== window) {
				window.parent.postMessage({ type: 'builderExpandToggle', expanded: active }, '*');
			} else {
				document.body.classList.toggle('builder-expanded', active);
			}
		});
	}

	function switchSidebarTab(tab) {
		document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
			btn.classList.toggle('is-active', btn.dataset.sidebarTab === tab);
		});
		document.querySelectorAll('[data-sidebar-panel]').forEach(panel => {
			panel.classList.toggle('is-hidden', panel.dataset.sidebarPanel !== tab);
		});
		document.getElementById('panelTemplates')?.classList.toggle('is-hidden', tab !== 'templates');
		document.getElementById('panelBlocks')?.classList.toggle('is-hidden', tab !== 'blocks');
		document.getElementById('panelCustom')?.classList.toggle('is-hidden', tab !== 'custom');
	}

	function bindSidebarTabs(onChange) {
		document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
			if (btn.dataset.sidebarTabBound === 'true') return;
			btn.dataset.sidebarTabBound = 'true';
			btn.addEventListener('click', () => {
				switchSidebarTab(btn.dataset.sidebarTab);
				if (onChange) onChange(btn.dataset.sidebarTab, btn);
			});
		});
	}

	function bindFilterEvents({
		container = document,
		onTemplateFilter,
		onBlockFilter,
		onDesignTemplateFilter,
		onDecoFilter
	} = {}) {
		const activate = btn => {
			if (!btn) return;
			if (btn.dataset.templateFilter) {
				container.querySelectorAll('[data-template-filter]').forEach(item => {
					item.classList.toggle('is-active', item === btn);
				});
				const handler = onBlockFilter || onTemplateFilter;
				if (handler) handler(btn.dataset.templateFilter, btn);
			}
			if (btn.dataset.designTemplateFilter) {
				container.querySelectorAll('[data-design-template-filter]').forEach(item => {
					item.classList.toggle('is-active', item === btn);
				});
				const handler = onDesignTemplateFilter || onTemplateFilter;
				if (handler) handler(btn.dataset.designTemplateFilter, btn);
			}
			if (btn.dataset.decoFilter) {
				container.querySelectorAll('[data-deco-filter]').forEach(item => {
					item.classList.toggle('is-active', item === btn);
				});
				if (onDecoFilter) onDecoFilter(btn.dataset.decoFilter, btn);
			}
		};

		container.querySelectorAll('.component-filters, .deco-filters, .design-template-filters').forEach(filterBar => {
			if (filterBar.dataset.filterBarBound === 'true') return;
			filterBar.dataset.filterBarBound = 'true';
			let pressButton = null;
			let startX = 0;
			let startY = 0;
			let moved = false;
			let suppressClick = false;

			filterBar.addEventListener('pointerdown', event => {
				if (event.button !== 0) return;
				pressButton = closestElement(event.target, '[data-template-filter], [data-deco-filter], [data-design-template-filter]');
				if (!pressButton || !filterBar.contains(pressButton)) {
					pressButton = null;
					return;
				}
				startX = event.clientX;
				startY = event.clientY;
				moved = false;
			});
			filterBar.addEventListener('pointermove', event => {
				if (!pressButton || moved) return;
				moved = Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5;
			});
			filterBar.addEventListener('pointerup', event => {
				if (!pressButton) return;
				const target = pressButton;
				pressButton = null;
				if (moved || !filterBar.contains(closestElement(event.target, '[data-template-filter], [data-deco-filter], [data-design-template-filter]') || target)) return;
				suppressClick = true;
				activate(target);
			});
			filterBar.addEventListener('pointercancel', () => {
				pressButton = null;
				moved = false;
			});
			filterBar.addEventListener('click', event => {
				const btn = closestElement(event.target, '[data-template-filter], [data-deco-filter], [data-design-template-filter]');
				if (!btn || !filterBar.contains(btn)) return;
				event.preventDefault();
				if (suppressClick) {
					suppressClick = false;
					return;
				}
				activate(btn);
			});
		});

		container.querySelectorAll('[data-template-filter], [data-deco-filter], [data-design-template-filter]').forEach(btn => {
			if (btn.closest('.component-filters, .deco-filters, .design-template-filters')) return;
			if (btn.dataset.filterButtonBound === 'true') return;
			btn.dataset.filterButtonBound = 'true';
			btn.addEventListener('click', event => {
				event.preventDefault();
				activate(btn);
			});
		});
	}

	function bindScrollableFilters(container = document) {
		container.querySelectorAll('.filter-scroll-shell').forEach(shell => {
			const scroller = shell.querySelector('.component-filters, .deco-filters, .design-template-filters');
			if (!scroller || scroller.dataset.scrollUiBound === 'true') return;
			scroller.dataset.scrollUiBound = 'true';

			shell.querySelector('.filter-scroll-arrow--left')?.addEventListener('click', () => {
				scroller.scrollBy({ left: -120, behavior: 'smooth' });
			});
			shell.querySelector('.filter-scroll-arrow--right')?.addEventListener('click', () => {
				scroller.scrollBy({ left: 120, behavior: 'smooth' });
			});

			const updateEdges = () => {
				const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
				shell.classList.toggle('is-start', scroller.scrollLeft <= 1);
				shell.classList.toggle('is-end', scroller.scrollLeft >= max - 1);
				shell.classList.toggle('is-scrollable', max > 1);
			};

			let dragging = false;
			let didDrag = false;
			let startX = 0;
			let startLeft = 0;

			scroller.addEventListener('pointerdown', event => {
				if (event.button !== 0) return;
				dragging = true;
				didDrag = false;
				startX = event.clientX;
				startLeft = scroller.scrollLeft;
				scroller.setPointerCapture?.(event.pointerId);
			});
			scroller.addEventListener('pointermove', event => {
				if (!dragging) return;
				const delta = event.clientX - startX;
				if (!didDrag && Math.abs(delta) < 5) return;
				didDrag = true;
				scroller.classList.add('is-dragging');
				event.preventDefault();
				scroller.scrollLeft = startLeft - delta;
			});
			const stopDrag = event => {
				if (!dragging) return;
				dragging = false;
				scroller.classList.remove('is-dragging');
				scroller.releasePointerCapture?.(event.pointerId);
			};
			scroller.addEventListener('click', event => {
				if (!didDrag) return;
				event.preventDefault();
				event.stopPropagation();
				didDrag = false;
			}, true);
			scroller.addEventListener('dragstart', event => event.preventDefault());
			scroller.addEventListener('pointerup', stopDrag);
			scroller.addEventListener('pointercancel', stopDrag);
			scroller.addEventListener('mouseleave', () => {
				dragging = false;
				didDrag = false;
				scroller.classList.remove('is-dragging');
			});
			scroller.addEventListener('wheel', event => {
				if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
				event.preventDefault();
				scroller.scrollLeft += event.deltaY;
			}, { passive: false });
			scroller.addEventListener('scroll', updateEdges);
			new ResizeObserver(updateEdges).observe(scroller);
			requestAnimationFrame(updateEdges);
		});
	}

	function bindComponentItems({
		container = document,
		canvasGrid = document.getElementById('canvasGrid'),
		getDragPayload,
		onAdd,
		onDragStart,
		onDragEnd
	} = {}) {
		container.querySelectorAll('.component-item').forEach(item => {
			if (item.dataset.componentSharedBound === 'true') return;
			item.dataset.componentSharedBound = 'true';
			const addItem = event => {
				if (closestElement(event?.target, 'button') && event.type === 'dblclick') return;
				event?.preventDefault();
				if (onAdd) onAdd(item, event);
			};
			item.addEventListener('dragstart', event => {
				const payload = getDragPayload ? getDragPayload(item, event) : `new-block:${item.dataset.type}`;
				if (!payload) return;
				event.dataTransfer.setData('text/plain', payload);
				event.dataTransfer.effectAllowed = payload.startsWith('existing') ? 'move' : 'copy';
				if (onDragStart) onDragStart(item, event, payload);
			});
			item.addEventListener('dragend', event => {
				canvasGrid?.classList.remove('is-over');
				if (onDragEnd) onDragEnd(item, event);
			});
			item.addEventListener('dblclick', addItem);
			item.querySelector('.component-add-btn')?.addEventListener('click', event => {
				event.stopPropagation();
				addItem(event);
			});
		});
	}

	function bindCanvasDropTargets({ canvasGrid, canvasWrapper, onDragOver, onDrop }) {
		[canvasGrid, canvasWrapper].filter(Boolean).forEach(target => {
			if (target.dataset.canvasDropBound === 'true') return;
			target.dataset.canvasDropBound = 'true';
			target.addEventListener('dragover', onDragOver);
			target.addEventListener('drop', onDrop);
		});
	}

	function bindClearCanvas(handler, button = document.getElementById('clearCanvas')) {
		if (!button || button.dataset.clearCanvasBound === 'true') return;
		button.dataset.clearCanvasBound = 'true';
		button.addEventListener('click', event => {
			event.preventDefault();
			if (handler) handler(event);
		});
	}

	function ensureOptionsPanelClose(panel) {
		if (!panel || panel.querySelector('[data-options-panel-close]')) return;
		const head = panel.querySelector('.options-panel-head, .options-panel-header, .block-props-head');
		const target = head || panel;
		target.insertAdjacentHTML(head ? 'beforeend' : 'afterbegin', `
			<button type="button" class="options-panel-close" data-options-panel-close aria-label="?듭뀡 ?リ린">
				<i class="ri-close-line" aria-hidden="true"></i>
			</button>`);
	}

	function bindOptionsPanelClose(handler, panel = document.getElementById('optionsPanel') || document.getElementById('blockPropsPanel')) {
		if (!panel || panel.dataset.optionsPanelCloseBound === 'true') return;
		panel.dataset.optionsPanelCloseBound = 'true';
		ensureOptionsPanelClose(panel);
		panel.addEventListener('click', event => {
			const closeButton = event.target.closest('[data-options-panel-close]');
			if (!closeButton || !panel.contains(closeButton)) return;
			event.preventDefault();
			if (handler) handler(event, panel);
		});
		const observer = new MutationObserver(() => ensureOptionsPanelClose(panel));
		observer.observe(panel, { childList: true });
		return observer;
	}

	function openMarkup(markupToggle) {
		document.body.classList.add('markup-open');
		markupToggle?.setAttribute('aria-expanded', 'true');
	}

	function closeMarkup(markupToggle) {
		document.body.classList.remove('markup-open');
		markupToggle?.setAttribute('aria-expanded', 'false');
	}

	function toggleMarkupPanel(markupToggle) {
		document.body.classList.contains('markup-open') ? closeMarkup(markupToggle) : openMarkup(markupToggle);
	}

	function splitMarkup(fullMarkup) {
		const full = fullMarkup || '';
		const match = full.match(/^(<style>[\s\S]*?<\/style>)\n*/);
		return {
			css: match ? match[1] : '',
			html: match ? full.slice(match[0].length) : full
		};
	}

	function formatMarkupForTab(fullMarkup, tab) {
		const { css, html } = splitMarkup(fullMarkup);
		if (tab === 'css') return css || MARKUP_EMPTY_CSS;
		if (tab === 'all') return fullMarkup || '';
		return html;
	}

	function bindMarkupTabs({
		output = document.getElementById('markupOutput'),
		getMarkup,
		defaultTab = 'html',
		onChange
	} = {}) {
		let currentTab = defaultTab;
		const tabs = Array.from(document.querySelectorAll('[data-markup-tab]'));
		const refresh = () => {
			if (!output || !getMarkup) return;
			output.value = formatMarkupForTab(getMarkup(), currentTab);
		};
		tabs.forEach(btn => {
			if (btn.dataset.markupTabBound === 'true') return;
			btn.dataset.markupTabBound = 'true';
			btn.addEventListener('click', () => {
				currentTab = btn.dataset.markupTab || 'html';
				tabs.forEach(item => item.classList.toggle('is-active', item === btn));
				refresh();
				if (onChange) onChange(currentTab, btn);
			});
		});
		refresh();
		return {
			refresh,
			getTab: () => currentTab,
			setTab(tab) {
				currentTab = tab || 'html';
				tabs.forEach(item => item.classList.toggle('is-active', item.dataset.markupTab === currentTab));
				refresh();
			}
		};
	}

	function copyText(text, onSuccess) {
		const fallback = () => {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.focus();
			textarea.select();
			document.execCommand('copy');
			textarea.remove();
			if (onSuccess) onSuccess();
		};
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(() => onSuccess && onSuccess()).catch(fallback);
			return;
		}
		fallback();
	}

	function initGuidedTour({
		button = document.getElementById('helpModeToggle'),
		steps = [],
		beforeStep,
		onEnd
	} = {}) {
		if (!button || !steps.length || button.dataset.guidedTourBound === 'true') return null;
		button.dataset.guidedTourBound = 'true';

		let prevSpotlight = null;
		const overlay = document.createElement('div');
		overlay.className = 'tour-overlay';
		overlay.hidden = true;
		document.body.appendChild(overlay);

		const callout = document.createElement('div');
		callout.className = 'tour-callout';
		callout.hidden = true;
		document.body.appendChild(callout);

		const clearSpotlight = () => {
			if (prevSpotlight) {
				prevSpotlight.classList.remove('tour-spotlight');
				prevSpotlight = null;
			}
		};

		const positionCallout = (targetEl, position) => {
			const rect = targetEl.getBoundingClientRect();
			const gap = 14;
			callout.style.top = '';
			callout.style.left = '';
			callout.style.right = '';
			if (position === 'right') {
				callout.style.left = Math.min(window.innerWidth - 320, rect.right + gap) + 'px';
				callout.style.top = Math.max(16, rect.top) + 'px';
			} else if (position === 'left') {
				callout.style.left = Math.max(16, rect.left - 320 - gap) + 'px';
				callout.style.top = Math.max(16, rect.top) + 'px';
			} else {
				callout.style.left = Math.max(16, Math.min(window.innerWidth - 320, rect.left)) + 'px';
				callout.style.top = Math.min(window.innerHeight - 220, rect.bottom + gap) + 'px';
			}
		};

		const endTour = () => {
			document.body.classList.remove('tour-active');
			overlay.hidden = true;
			callout.hidden = true;
			clearSpotlight();
			button.classList.remove('is-active');
			button.setAttribute('aria-pressed', 'false');
			if (onEnd) onEnd();
		};

		const showStep = index => {
			const step = steps[index];
			if (!step) return endTour();
			if (beforeStep) beforeStep(index, step);

			clearSpotlight();
			const targetEl = document.querySelector(step.target);
			if (targetEl) {
				targetEl.classList.add('tour-spotlight');
				prevSpotlight = targetEl;
			}

			const isFirst = index === 0;
			const isLast = index === steps.length - 1;
			callout.innerHTML = `
				<div class="tour-callout-step">STEP ${index + 1} / ${steps.length}</div>
				<strong class="tour-callout-title">${step.title}</strong>
				<p class="tour-callout-desc">${step.desc}</p>
				<div class="tour-callout-actions">
					<button type="button" class="tour-skip">건너뛰기</button>
					<div class="tour-nav">
						${!isFirst ? '<button type="button" class="tour-prev">이전</button>' : ''}
						<button type="button" class="tour-next${isLast ? ' is-last' : ''}">${isLast ? '완료' : '다음'}</button>
					</div>
				</div>`;
			callout.hidden = false;
			if (targetEl) positionCallout(targetEl, step.position);
			callout.querySelector('.tour-skip')?.addEventListener('click', endTour);
			callout.querySelector('.tour-prev')?.addEventListener('click', () => showStep(index - 1));
			callout.querySelector('.tour-next')?.addEventListener('click', () => isLast ? endTour() : showStep(index + 1));
		};

		const startTour = () => {
			document.body.classList.add('tour-active');
			overlay.hidden = false;
			button.classList.add('is-active');
			button.setAttribute('aria-pressed', 'true');
			showStep(0);
		};

		button.addEventListener('click', () => {
			if (document.body.classList.contains('tour-active')) endTour();
			else startTour();
		});

		return { start: startTour, end: endTour };
	}

	window.KlicBuilderShared = {
		initBuilderHeader,
		switchSidebarTab,
		bindSidebarTabs,
		bindFilterEvents,
		bindScrollableFilters,
		bindComponentItems,
		bindCanvasDropTargets,
		bindClearCanvas,
		bindOptionsPanelClose,
		openMarkup,
		closeMarkup,
		toggleMarkupPanel,
		splitMarkup,
		formatMarkupForTab,
		bindMarkupTabs,
		copyText,
		initGuidedTour
	};
	initBuilderHeader();
})();
