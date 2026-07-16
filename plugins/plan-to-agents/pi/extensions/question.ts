/**
 * Question tool — ask the user to pick from options (with optional multi-select).
 *
 * Upstream reference: pi-coding-agent/examples/extensions/question.ts
 * @see https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/question.ts
 * Pinned: main @ 2026-07-16
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	Text,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Type } from "typebox";

interface OptionWithDesc {
	label: string;
	description?: string;
}

type DisplayOption = OptionWithDesc & { isOther?: boolean };

export interface QuestionDetails {
	question: string;
	options: string[];
	answers: string[];
	multiSelect: boolean;
	wasCustom?: boolean;
	cancelled: boolean;
}

const OptionSchema = Type.Object({
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionParams = Type.Object({
	question: Type.String({ description: "The question to ask the user" }),
	options: Type.Array(OptionSchema, { description: "Options for the user to choose from" }),
	multiSelect: Type.Optional(
		Type.Boolean({ description: "Allow selecting multiple options (space toggles, enter confirms)" }),
	),
});

export default function question(pi: ExtensionAPI) {
	pi.registerTool({
		name: "question",
		label: "Question",
		description:
			"Ask the user a question and let them pick from options. Use when you need user input to proceed. Set multiSelect for checkbox-style selection.",
		parameters: QuestionParams,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const multiSelect = params.multiSelect ?? false;
			const simpleOptions = params.options.map((o) => o.label);

			if (ctx.mode !== "tui") {
				return {
					content: [{ type: "text", text: "Error: UI not available (running in non-interactive mode)" }],
					details: {
						question: params.question,
						options: simpleOptions,
						answers: [],
						multiSelect,
						cancelled: true,
					} satisfies QuestionDetails,
				};
			}

			if (params.options.length === 0) {
				return {
					content: [{ type: "text", text: "Error: No options provided" }],
					details: {
						question: params.question,
						options: [],
						answers: [],
						multiSelect,
						cancelled: true,
					} satisfies QuestionDetails,
				};
			}

			const allOptions: DisplayOption[] = multiSelect
				? [...params.options]
				: [...params.options, { label: "Type something.", isOther: true }];

			const result = await ctx.ui.custom<{
				answers: string[];
				wasCustom: boolean;
				cancelled: boolean;
			} | null>((tui, theme, _kb, done) => {
				let optionIndex = 0;
				let editMode = false;
				const selected = new Set<number>();
				let cachedLines: string[] | undefined;

				const editorTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				editor.onSubmit = (value) => {
					const trimmed = value.trim();
					if (trimmed) {
						done({ answers: [trimmed], wasCustom: true, cancelled: false });
					} else {
						editMode = false;
						editor.setText("");
						refresh();
					}
				};

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function handleInput(data: string) {
					if (editMode) {
						if (matchesKey(data, Key.escape)) {
							editMode = false;
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(allOptions.length - 1, optionIndex + 1);
						refresh();
						return;
					}

					if (multiSelect && matchesKey(data, Key.space)) {
						if (selected.has(optionIndex)) selected.delete(optionIndex);
						else selected.add(optionIndex);
						refresh();
						return;
					}

					if (matchesKey(data, Key.enter)) {
						const selectedOption = allOptions[optionIndex];
						if (multiSelect) {
							const answers =
								selected.size > 0
									? Array.from(selected)
											.sort((a, b) => a - b)
											.map((i) => allOptions[i].label)
									: [selectedOption.label];
							done({ answers, wasCustom: false, cancelled: false });
							return;
						}

						if (selectedOption.isOther) {
							editMode = true;
							refresh();
						} else {
							done({ answers: [selectedOption.label], wasCustom: false, cancelled: false });
						}
						return;
					}

					if (matchesKey(data, Key.escape)) {
						done(null);
					}
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const renderWidth = Math.max(1, width);

					function addWrapped(text: string) {
						lines.push(...wrapTextWithAnsi(text, renderWidth));
					}

					function addWrappedWithPrefix(prefix: string, text: string) {
						const prefixWidth = visibleWidth(prefix);
						if (prefixWidth >= renderWidth) {
							addWrapped(prefix + text);
							return;
						}
						const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
						const continuationPrefix = " ".repeat(prefixWidth);
						for (let i = 0; i < wrapped.length; i++) {
							lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
						}
					}

					lines.push(theme.fg("accent", "─".repeat(renderWidth)));
					addWrappedWithPrefix(" ", theme.fg("text", params.question));
					lines.push("");

					for (let i = 0; i < allOptions.length; i++) {
						const opt = allOptions[i];
						const focused = i === optionIndex;
						const isOther = opt.isOther === true;
						const checked = multiSelect && selected.has(i);
						const prefix = focused ? theme.fg("accent", "> ") : " ";
						const marker = multiSelect ? `${checked ? "[x]" : "[ ]"} ` : "";
						const label = `${i + 1}. ${marker}${opt.label}${isOther && editMode ? " ✎" : ""}`;
						const color = focused || (isOther && editMode) ? "accent" : "text";

						addWrappedWithPrefix(prefix, theme.fg(color, label));
						if (opt.description) {
							addWrappedWithPrefix(" ", theme.fg("muted", opt.description));
						}
					}

					if (editMode) {
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("muted", "Your answer:"));
						for (const line of editor.render(Math.max(1, renderWidth - 2))) {
							lines.push(` ${line}`);
						}
					}

					lines.push("");
					if (editMode) {
						addWrappedWithPrefix(" ", theme.fg("dim", "Enter to submit • Esc to go back"));
					} else if (multiSelect) {
						addWrappedWithPrefix(
							" ",
							theme.fg("dim", "↑↓ navigate • Space toggle • Enter to confirm • Esc to cancel"),
						);
					} else {
						addWrappedWithPrefix(
							" ",
							theme.fg("dim", "↑↓ navigate • Enter to select • Esc to cancel"),
						);
					}
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			if (!result) {
				return {
					content: [{ type: "text", text: "User cancelled the selection" }],
					details: {
						question: params.question,
						options: simpleOptions,
						answers: [],
						multiSelect,
						cancelled: true,
					} satisfies QuestionDetails,
				};
			}

			if (result.wasCustom) {
				return {
					content: [{ type: "text", text: `User wrote: ${result.answers[0]}` }],
					details: {
						question: params.question,
						options: simpleOptions,
						answers: result.answers,
						multiSelect,
						wasCustom: true,
						cancelled: false,
					} satisfies QuestionDetails,
				};
			}

			const answerText =
				result.answers.length === 1
					? `User selected: ${result.answers[0]}`
					: `User selected: ${result.answers.join(", ")}`;

			return {
				content: [{ type: "text", text: answerText }],
				details: {
					question: params.question,
					options: simpleOptions,
					answers: result.answers,
					multiSelect,
					cancelled: false,
				} satisfies QuestionDetails,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("question ")) + theme.fg("muted", args.question);
			const opts = Array.isArray(args.options) ? args.options : [];
			if (opts.length) {
				const labels = opts.map((o: OptionWithDesc) => o.label);
				text += `\n${theme.fg("dim", ` Options: ${labels.join(", ")}`)}`;
			}
			if (args.multiSelect) text += `\n${theme.fg("dim", " (multi-select)")}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as QuestionDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.cancelled || details.answers.length === 0) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			if (details.wasCustom) {
				return new Text(
					theme.fg("success", "✓ ") + theme.fg("muted", "(wrote) ") + theme.fg("accent", details.answers[0]),
					0,
					0,
				);
			}

			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", details.answers.join(", ")), 0, 0);
		},
	});
}
