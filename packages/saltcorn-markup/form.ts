/**
 * @category saltcorn-markup
 * @module form
 */

import tags = require("./tags");
const {
  p,
  div,
  i,
  label,
  text,
  text_attr,
  button,
  a,
  h5,
  span,
  script,
  domReady,
  ul,
  li,
  input,
  pre,
  select,
  textarea,
  option,
} = tags;
import renderLayout = require("./layout");
import helpers = require("./helpers");
const { isdef, select_options, search_bar } = helpers;
import type { AbstractForm as Form } from "@saltcorn/types/model-abstracts/abstract_form";
import {
  AbstractFieldRepeat,
  instanceOfField,
} from "@saltcorn/types/model-abstracts/abstract_field";
import type {
  FieldLike,
  JoinFieldOption,
  RelationOption,
} from "@saltcorn/types/base_types";
import layout_utils from "./layout_utils";
const { renderTabs } = layout_utils;

declare const window: any;
const isNode = typeof window === "undefined";

/**
 * @param s
 * @returns
 */
const rmInitialDot = (s: string): string =>
  s && s[0] === "." ? s.replace(".", "") : s;

const buildActionAttribute = (form: Form): string =>
  (isNode && !form.req?.smr) || form.isWorkflow
    ? form.action!
    : "javascript:void(0)";

/**
 * @param sIf
 * @returns
 */
const mkShowIf = (sIf: any): string =>
  encodeURIComponent(
    Object.entries(sIf)
      .map(([target, value]) =>
        typeof value === "boolean"
          ? `e.data("data-closest-form-ns").find('[data-fieldname=${rmInitialDot(
              target
            )}]').prop('checked')===${JSON.stringify(value)}`
          : Array.isArray(value)
            ? `[${value
                .map((v) => `'${v}'`)
                .join()}].includes(e.data("data-closest-form-ns").find('[data-fieldname=${rmInitialDot(
                target
              )}]:not(:disabled)').val())`
            : target.includes("|_")
              ? `splitTargetMatch(e.data("data-closest-form-ns").find('[data-fieldname=${
                  rmInitialDot(target).split("|_")[0]
                }]:not(:disabled)').val(),'${value}', '${target}')`
              : `e.data("data-closest-form-ns").find('[data-fieldname=${rmInitialDot(
                  target
                )}]:not(:disabled)').val()==='${value}'`
      )
      .join(" && ")
  );

/**
 * @param formStyle
 * @returns
 */
const isHoriz = (formStyle: string): boolean => formStyle === "horiz";

/**
 * @param hdr
 * @param inner
 * @param error
 * @param fStyle
 * @param labelCols
 * @returns
 */
const formRowWrap = (
  hdr: any,
  inner: any,
  error: string = "",
  fStyle: string,
  labelCols: number
): string =>
  div(
    {
      class: [
        "form-group",
        isHoriz(fStyle) && hdr.input_type !== "dynamic_fields" && "row",
      ],
      "data-disabled": hdr.disabled ? "true" : false,
      ...(hdr.showIf && {
        style: "display: none;",
        "data-show-if": mkShowIf(hdr.showIf),
      }),
    },
    hdr.input_type === "section_header"
      ? div(
          {
            class:
              hdr.attributes?.secondColHoriz && isHoriz(fStyle)
                ? `offset-sm-${labelCols} col-sm-${12 - labelCols}`
                : `col-sm-12`,
          },
          h5(text(hdr.label)),
          hdr.help && !hdr.sublabel ? helpLink(hdr.help) : "",
          //hdr.sublabel && p(i(hdr.sublabel)),
          mkSubLabelAndHelp(hdr)
        )
      : hdr.input_type === "dynamic_fields"
        ? inner
        : hdr.type?.name === "Bool" && fStyle === "vert"
          ? div(
              { class: "form-check" },
              inner,
              label(
                {
                  for: `input${text_attr(hdr.form_name)}`,
                },
                text(hdr.label)
              ),
              hdr.help && !hdr.sublabel ? helpLink(hdr.help) : ""
            ) + mkSubLabelAndHelp(hdr)
          : [
              hdr.label !== " " &&
                div(
                  {
                    class: [
                      hdr.type?.name === "Bool" &&
                        isHoriz(fStyle) &&
                        labelCols &&
                        `col-${labelCols} text-end`,
                      hdr.type?.name !== "Bool" &&
                        isHoriz(fStyle) &&
                        labelCols &&
                        `col-sm-${labelCols} text-md-end`,
                      labelCols === 0 && "d-none",
                    ],
                  },
                  label(
                    {
                      for: `input${text_attr(hdr.form_name)}`,
                    },
                    text(hdr.label)
                  ),
                  hdr.help && !hdr.sublabel ? helpLink(hdr.help) : ""
                ),
              div(
                {
                  class: [
                    hdr.type?.name === "Bool" &&
                      isHoriz(fStyle) &&
                      `col-${12 - labelCols}`,
                    hdr.type?.name !== "Bool" &&
                      isHoriz(fStyle) &&
                      `col-sm-${12 - labelCols}`,
                  ],
                },
                inner,
                text(error),
                mkSubLabelAndHelp(hdr)
              ),
            ]
  );

/**
 * builds dropdown submenus to select a field,
 * joined from the table of the current view template
 * @param joinsFromTbl
 * @returns
 */
const buildFieldsMenu = (joinsFromTbl: JoinFieldOption[]) => {
  return div(
    {
      class: "dropdown-menu",
    },
    ul(
      { class: "ps-0 mb-0" },
      joinsFromTbl.map((field: any) => {
        return field.subFields && field.subFields.length > 0
          ? li(
              { class: "dropdown-item dropend" },
              div(
                {
                  id: `_field_${field.fieldPath}`,
                  class: "dropdown-toggle field-dropdown-submenu",
                  "data-bs-toggle": "dropdown",
                  "aria-expanded": false,
                  role: "button",
                },
                field.name
              ),
              div(
                { class: "dropdown-menu" },
                h5(
                  {
                    class: "join-table-header",
                  },
                  field.table
                ),
                ul(
                  { class: "ps-0" },
                  field.subFields.map((subOne: any) => {
                    return subOne.subFields && subOne.subFields.length > 0
                      ? li(
                          { class: "dropdown-item dropend" },
                          div(
                            {
                              id: `_field_${subOne.fieldPath}`,
                              class: "dropdown-toggle field-dropdown-submenu",
                              "data-bs-toggle": "dropdown",
                              "aria-expanded": false,
                              role: "button",
                            },
                            subOne.name
                          ),
                          div(
                            { class: "dropdown-menu" },
                            h5(
                              {
                                class: "join-table-header",
                              },
                              subOne.table
                            ),
                            ul(
                              { class: "ps-0" },
                              subOne.subFields.map((subTwo: any) => {
                                return (subTwo.subFields &&
                                  subTwo.subFields.length) > 0
                                  ? li(
                                      { class: "dropdown-item dropend" },
                                      div(
                                        {
                                          id: `_field_${subTwo.fieldPath}`,
                                          class:
                                            "dropdown-toggle field-dropdown-submenu",
                                          "data-bs-toggle": "dropdown",
                                          "aria-expanded": false,
                                          role: "button",
                                        },
                                        subTwo.name
                                      ),
                                      div(
                                        { class: "dropdown-menu" },
                                        h5(
                                          {
                                            class: "join-table-header",
                                          },
                                          subTwo.table
                                        ),
                                        ul(
                                          { class: "ps-0" },
                                          subTwo.subFields.map(
                                            (subThree: any) => {
                                              return li(
                                                {
                                                  class:
                                                    "dropdown-item field-val-item",
                                                  onclick: `join_field_clicked(this, '${subThree.fieldPath}')`,
                                                  role: "button",
                                                },
                                                subThree.name
                                              );
                                            }
                                          )
                                        )
                                      )
                                    )
                                  : li(
                                      {
                                        class: "dropdown-item field-val-item",
                                        onclick: `join_field_clicked(this, '${subTwo.fieldPath}')`,
                                        role: "button",
                                      },
                                      subTwo.name
                                    );
                              })
                            )
                          )
                        )
                      : li(
                          {
                            class: "dropdown-item field-val-item",
                            onclick: `join_field_clicked(this, '${subOne.fieldPath}')`,
                            role: "button",
                          },
                          subOne.name
                        );
                  })
                )
              )
            )
          : li(
              {
                class: "dropdown-item field-val-item",
                onclick: `join_field_clicked(this, '${field.fieldPath}')`,
                role: "button",
              },
              field.name
            );
      })
    )
  );
};

/**
 * builds dropdown submenus to select a field,
 * joined from another table to the table of the current view template
 * @param relationJoins
 * @returns
 */
const buildRelationsMenu = (relationJoins: RelationOption[]) => {
  return div(
    {
      class: "dropdown-menu",
    },
    ul(
      { class: "ps-0 mb-0" },
      relationJoins.map((join: any) => {
        return li(
          { class: "dropdown-item dropend" },
          div(
            {
              id: `_relation_${join.relationPath}`,
              class: "dropdown-toggle relation-dropdown-submenu",
              "data-bs-toggle": "dropdown",
              "aria-expanded": false,
              role: "button",
            },
            join.relationPath
          ),
          div(
            { class: "dropdown-menu" },
            ul(
              { class: "ps-0 mb-0" },
              join.relationFields.map((fName: string) => {
                return li(
                  {
                    class: "dropdown-item field-val-item",
                    onclick: `join_field_clicked(this, '${join.relationPath}->${fName}')`,
                    role: "button",
                  },
                  fName
                );
              })
            )
          )
        );
      })
    )
  );
};

/**
 * build a menu with submenus to navigate the table schema and select a join field
 * @param hdr options for direct join or relation join fields
 * @returns
 */
const buildJoinFieldPicker = (hdr: any): string => {
  const joinAndRelFields =
    hdr.attributes.join_field_options?.length > 0 &&
    hdr.attributes.relation_options?.length > 0;
  return (
    div(
      {
        class: "d-flex",
      },
      hdr.attributes.join_field_options?.length > 0
        ? div(
            { class: " dropdown" },
            button(
              {
                type: "button",
                class: "btn btn-outline-primary dropdown-toggle",
                "data-bs-toggle": "dropdown",
                "aria-expanded": false,
              },
              "Fields"
            ),
            buildFieldsMenu(hdr.attributes.join_field_options)
          )
        : "",
      hdr.attributes.relation_options?.length > 0
        ? div(
            { class: `dropdown ${joinAndRelFields ? "ps-2" : ""}` },
            button(
              {
                type: "button",
                class: "btn btn-outline-primary dropdown-toggle",
                "data-bs-toggle": "dropdown",
                "aria-expanded": false,
              },
              "Relations"
            ),
            buildRelationsMenu(hdr.attributes.relation_options)
          )
        : "",
      div(
        { class: "flex-grow-1 ps-2" },
        input({
          id: "inputjoin_field",
          type: "text",
          class: "form-control bg-white item-menu",
          name: "join_field",
          "data-fieldname": "join_field",
          readonly: "readonly",
        })
      )
    ) +
    script(
      domReady(`
    $(".join-table-header").click(function(e) {
      e.stopPropagation();
    });
    $(".field-dropdown-submenu").click(function(e) {
      e.stopPropagation();
      const clickedField = e.target.id.replace("_field_", "");
      $(".field-dropdown-submenu.show").each(function (index) {
        const openField = this.id.replace("_field_", "");
        if (clickedField.indexOf(openField) < 0) {
          $(this).dropdown("toggle");
        }
      });
    });
    $(".relation-dropdown-submenu").click(function(e) {
      e.stopPropagation();
      $(".relation-dropdown-submenu.show").each(function (index) {
        if(this.id !== e.target.id)
          $(this).dropdown("toggle");
      });
    });
    const joinItems = $(".field-val-item");
    if (joinItems.length > 0) joinItems[0].click();    
    `)
    )
  );
};

/**
 * @param v
 * @param errors
 * @param nameAdd
 * @returns
 */
const innerField =
  (
    v: any,
    errors: any[],
    nameAdd: string = "",
    classAdd: string = ""
  ): ((hdr: any) => string) =>
  (hdr: any): string => {
    const name: any = hdr.form_name + nameAdd;
    const validClass = errors[name] ? `is-invalid ${classAdd}` : classAdd;
    const maybe_disabled = hdr.disabled ? " disabled data-disabled" : "";

    switch (hdr.input_type) {
      case "join_field_picker":
        return buildJoinFieldPicker(hdr);
      case "fromtype":
        return displayEdit(
          hdr,
          name,
          hdr.parent_field && v && isdef(v[hdr.parent_field]?.[hdr.name])
            ? v[hdr.parent_field]?.[hdr.name]
            : v && isdef(v[hdr.form_name])
              ? v[hdr.form_name]
              : hdr.default,
          validClass,
          v
        );
      case "hidden":
        return input({
          type: "hidden",
          class: `form-control ${validClass} ${hdr.class || ""}`,
          name: text_attr(name),
          ...(v ? { value: text_attr(v[hdr.form_name]) } : {}),
        });
      case "select":
        const opts = select_options(v, hdr, false, "", false);
        return select(
          {
            class: `form-control form-select ${validClass} ${hdr.class || ""}`,
            "data-fieldname": text_attr(hdr.form_name),
            ...(hdr.attributes.onChange
              ? { onchange: hdr.attributes.onChange }
              : {}),
            ...(hdr.attributes.explainers
              ? {
                  "data-explainers": encodeURIComponent(
                    JSON.stringify(hdr.attributes.explainers)
                  ),
                }
              : {}),
            ...(hdr.attributes.autocomplete
              ? { autocomplete: hdr.attributes.autocomplete }
              : {}),
            ...(hdr.attributes.multiple ? { multiple: "multiple" } : {}),
            ...(hdr.attributes.size ? { size: hdr.attributes.size } : {}),
            ...(maybe_disabled
              ? { disabled: true, "data-disabled": "true" }
              : {}),
            name: text_attr(name),
            id: `input${text_attr(name)}`,
          },
          opts
        );

      case "textarea":
        return textarea(
          {
            class: `form-control ${validClass} ${hdr.class || ""}`,
            ...(maybe_disabled
              ? { disabled: true, "data-disabled": "true" }
              : {}),
            "data-fieldname": text_attr(hdr.form_name),
            name: text_attr(name),
            id: `input${text_attr(name)}`,
          },
          text(v[hdr.form_name] || "")
        );
      case "code":
        return textarea(
          {
            mode: (hdr.attributes || {}).mode || "",
            class: `to-code form-control ${validClass} ${hdr.class || ""}`,
            ...(maybe_disabled
              ? { disabled: true, "data-disabled": "true" }
              : {}),
            "data-fieldname": text_attr(hdr.form_name),
            name: text_attr(name),
            id: `input${text_attr(name)}`,
          },
          v[hdr.form_name] || ""
        );
      case "time_of_day":
        return [
          input({
            class: `form-control ${validClass} ${hdr.class || ""}`,
            ...(maybe_disabled
              ? { disabled: true, "data-disabled": "true" }
              : {}),
            "data-fieldname": text_attr(hdr.form_name),
            name: text_attr(name),
            id: `input${text_attr(name)}`,
            type: "text",
            placeholder: "Select time of day..",
            readonly: true,
            value:
              v && isdef(v[hdr.form_name]) ? text_attr(v[hdr.form_name]) : "",
          }),
          script(
            domReady(`$('#input${text_attr(name)}').flatpickr({
              noCalendar: true,
              enableTime: true,
              time_24hr: true,
              timeFormat: 'H:i'
            });`)
          ),
        ].join("");
      case "time_of_week":
        const tow_val = v[hdr.form_name];
        let tow_d, tow_h, tow_m;
        if (tow_val) {
          [tow_d, tow_h, tow_m] = tow_val.split(" ");
        }
        return [
          input({
            type: "hidden",
            name: text_attr(name),
            id: `inputh${text_attr(name)}`,
            "data-fieldname": text_attr(hdr.form_name),
            value: text_attr(tow_val),
          }),
          div({ class: "d-flex" }, [
            select(
              {
                class: "form-control form-select",
                id: `input${text_attr(name)}__day`,
                onchange: `update_time_of_week('${text_attr(name)}')(this)`,
              },
              [
                option({ selected: tow_d === "Monday" }, "Monday"),
                option({ selected: tow_d === "Tuesday" }, "Tuesday"),
                option({ selected: tow_d === "Wednesday" }, "Wednesday"),
                option({ selected: tow_d === "Thursday" }, "Thursday"),
                option({ selected: tow_d === "Friday" }, "Friday"),
                option({ selected: tow_d === "Saturday" }, "Saturday"),
                option({ selected: tow_d === "Sunday" }, "Sunday"),
              ]
            ),
            input({
              class: `form-control ${validClass} ${hdr.class || ""}`,
              ...(maybe_disabled
                ? { disabled: true, "data-disabled": "true" }
                : {}),
              id: `input${text_attr(name)}__time`,
              type: "text",
              placeholder: "Select time of day..",
              readonly: true,
              value: tow_h && tow_m ? `${tow_h}:${tow_m}` : "12:00",
            }),
          ]),
          script(
            domReady(`$('#input${text_attr(name)}__time').flatpickr({
              noCalendar: true,
              enableTime: true,
              time_24hr: true,
              timeFormat: 'H:i',
              onChange: update_time_of_week('${text_attr(name)}')
            });`)
          ),
        ].join("");

      case "date":
        return [
          input({
            class: `form-control ${validClass} ${hdr.class || ""}`,
            ...(maybe_disabled
              ? { disabled: true, "data-disabled": "true" }
              : {}),
            "data-fieldname": text_attr(hdr.form_name),
            name: text_attr(name),
            id: `input${text_attr(name)}`,
            type: "text",
            placeholder: "Select date..",
            readonly: true,
            value:
              v && isdef(v[hdr.form_name]) ? text_attr(v[hdr.form_name]) : "",
          }),
          script(
            domReady(`$('#input${text_attr(name)}').flatpickr({              
              enableTime: true,
              dateFormat: "Z",
              time_24hr: true,
              altFormat: "Y-m-d H:i",
              altInput: true,
              ${
                hdr.attributes.minDate
                  ? `minDate: new Date("${hdr.attributes.minDate.toISOString()}"),`
                  : ""
              }
              ${
                hdr.attributes.maxDate
                  ? `maxDate: new Date("${hdr.attributes.maxDate.toISOString()}"),`
                  : ""
              }
            });`)
          ),
        ].join("");
      case "file":
        if (hdr.attributes && hdr.attributes.select_file_where) {
          hdr.input_type = "select";
          return innerField(v, errors, nameAdd)(hdr);
        } else
          return [
            v && isdef(v[hdr.form_name]) ? text(v[hdr.form_name]) : "",
            input({
              type: "file",
              class: `form-control-file ${validClass} ${hdr.class || ""}`,
              ...(maybe_disabled
                ? { disabled: true, "data-disabled": "true" }
                : {}),
              name: text_attr(name),
              id: `input${text_attr(name)}`,
            }),
          ].join("");
      case "search":
        return search_bar(name, v && v[hdr.form_name]);
      case "section_header":
        return "";
      case "dynamic_fields":
        return div({
          "data-source-url": hdr.attributes.getFields,
          "data-relevant-fields": (hdr.attributes.relevantFields || []).join(
            ","
          ),
        });
      case "custom_html":
        return hdr.attributes.html;
      default:
        const the_input = input({
          type: hdr.input_type,
          class: `form-control ${validClass} ${hdr.class || ""}`,
          ...(maybe_disabled
            ? { disabled: true, "data-disabled": "true" }
            : {}),
          ...(hdr.attributes?.autocomplete
            ? { autocomplete: hdr.attributes.autocomplete }
            : {}),
          "data-fieldname": text_attr(hdr.form_name),
          name: name,
          id: `input${text_attr(name)}`,
          ...(v && isdef(v[hdr.form_name])
            ? { value: text_attr(v[hdr.form_name]) }
            : {}),
          ...(hdr.attributes?.autofocus ? { autofocus: true } : {}),
        });

        const inner = hdr.postText
          ? div(
              { class: "input-group" },
              the_input,

              span(
                { class: "input-group-text", id: "basic-addon2" },
                hdr.postText
              )
            )
          : the_input;
        return inner;
    }
  };

/**
 * @param v
 * @param errors
 * @param formStyle
 * @param labelCols
 * @returns
 */
const mkFormRow =
  (
    v: any,
    errors: any[],
    formStyle: string,
    labelCols: any
  ): ((hdr: any) => string) =>
  (hdr: any): string =>
    hdr.isRepeat && hdr.fancyMenuEditor
      ? mkFormRowForRepeatFancy(v, errors, formStyle, labelCols, hdr)
      : hdr.isRepeat
        ? mkFormRowForRepeat(v, errors, formStyle, labelCols, hdr)
        : mkFormRowForField(v, errors, formStyle, labelCols)(hdr);

/**
 * @param v
 * @param errors
 * @param formStyle
 * @param labelCols
 * @param hdr
 * @returns
 */
const mkFormRowForRepeatFancy = (
  v: any,
  errors: any[],
  formStyle: string,
  labelCols: number,
  hdr: any
): string => {
  // console.log(v);

  const fldHtmls: String[] = [];
  hdr.fields.forEach((f: any) => {
    f.class = `${f.class || ""} item-menu`;
  });
  for (let i = 0; i < hdr.fields.length; i++) {
    const field = hdr.fields[i];
    if ((field as any)?.attributes?.asideNext) {
      fldHtmls.push(
        mkFormRowAside(
          {},
          errors,
          "vert",
          labelCols,
          "",
          field,
          hdr.fields[i + 1]
        )
      );
      i++;
    } else {
      fldHtmls.push(mkFormRow({}, errors, "vert", labelCols)(field));
    }
  }
  return div(
    { class: "row w-100" },
    div(
      { class: "col-6 mb-3" },
      h5("Columns"), // todo i18n
      div(ul({ id: "myEditor", class: "sortableLists list-group" }))
    ),
    div(
      { class: "col-6 mb-3", id: "menuForm" },
      h5("Column configuration"),
      fldHtmls.join(""),
      button(
        { type: "button", id: "btnUpdate", class: "btn btn-primary me-2" },
        "Update"
      ),
      button({ type: "button", id: "btnAdd", class: "btn btn-primary" }, "Add")
    ),
    script(
      domReady(`
      var iconPickerOptions = {searchText: "Search icon...", labelHeader: "{0}/{1}"};

      var sortableListOptions = {
        placeholderCss: {'background-color': "#cccccc"},
    
    };
    let editor = new MenuEditor('myEditor', 
              { 
              listOptions: sortableListOptions, 
              iconPicker: iconPickerOptions,
              getLabelText: columnSummary,
              onUpdate: ()=>{
                apply_showif();
                repeaterCopyValuesToForm($('#menuForm').closest("form"), editor);
              },
              labelEdit: 'Edit&nbsp;<i class="fas fa-edit clickable"></i>',
              maxLevel: 0 // (Optional) Default is -1 (no level limit)
              // Valid levels are from [0, 1, 2, 3,...N]
              });
  editor.setForm($('#menuForm'));
  editor.setUpdateButton($('#btnUpdate'));
  editor.setData(${JSON.stringify(v[hdr.form_name])});
  $('.btnEdit').click(()=>{setTimeout(()=>{apply_showif();apply_showif();},0)});
  $('#btnAdd').click(function(){
    editor.add();
    repeaterCopyValuesToForm($('#menuForm').closest("form"), editor)
  });

  $("#btnUpdate").click(function(){
    editor.update();
    repeaterCopyValuesToForm($('#menuForm').closest("form"), editor)
  });
  $('#menuForm').closest("form").submit(function(event) {
    event.preventDefault(); //this will prevent the default submit

    repeaterCopyValuesToForm($('#menuForm').closest("form"), editor)
    $(this).unbind('submit').submit(); // continue the submit unbind preventDefault
   })
   setTimeout(()=>repeaterCopyValuesToForm($('#menuForm').closest("form"), editor,true), 0);
   `)
    )
  );
};
const repeater_icons = div(
  { class: "float-end" },
  span({ onclick: "rep_up(this)" }, i({ class: "fa fa-arrow-up pull-right" })),
  "&nbsp;",
  span({ onclick: "rep_del(this)" }, i({ class: "fa fa-times pull-right" })),
  "&nbsp;",
  span(
    { onclick: "rep_down(this)" },
    i({ class: "fa fa-arrow-down pull-right" })
  )
);
const repeater_adder = (form_name: string) =>
  a(
    {
      class: "btn btn-sm btn-outline-primary mb-3",
      href: `javascript:add_repeater('${form_name}')`,
      title: "Add",
    },
    i({ class: "fas fa-plus" })
  );

/**
 * @param v
 * @param errors
 * @param formStyle
 * @param labelCols
 * @param hdr
 * @returns
 */
const mkFormRowForRepeat = (
  v: any,
  errors: any[],
  formStyle: string,
  labelCols: number,
  hdr: any
): string => {
  const adder = repeater_adder(hdr.form_name);
  if (Array.isArray(v[hdr.form_name]) && v[hdr.form_name].length > 0) {
    return div(
      hdr.showIf
        ? {
            "data-show-if": mkShowIf(hdr.showIf),
            style: "display: none;",
          }
        : {},
      div(
        {
          class: `repeats-${hdr.form_name}`,
        },
        v[hdr.form_name].map((vi: any, ix: number) => {
          return div(
            { class: `form-repeat form-namespace repeat-${hdr.form_name}` },
            repeater_icons,
            hdr.fields.map((f: any) => {
              return mkFormRowForField(
                vi,
                errors,
                formStyle,
                labelCols,
                "_" + ix
              )(f);
            })
          );
        })
      ),
      adder
    );
  } else if (hdr.defaultNone) {
    const rndid = `fldrep${Math.floor(Math.random() * 16777215).toString(16)}`;
    let inner =
      div(
        {
          class: `repeats-${hdr.form_name}`,
        },
        div(
          { class: `form-repeat form-namespace repeat-${hdr.form_name}` },
          repeater_icons,
          hdr.fields.map((f: any) => {
            return mkFormRowForField(v, errors, formStyle, labelCols, "_0")(f);
          })
        )
      ) + adder;
    return div(
      {
        "data-show-if": hdr.showIf ? mkShowIf(hdr.showIf) : undefined,
        id: rndid,
      },
      pre({ class: "d-none" }, encodeURIComponent(inner)),
      a(
        {
          class: "btn btn-sm btn-outline-primary mb-3",
          onclick: `$('#${rndid}').html(decodeURIComponent($('#${rndid} pre').text()))`,
          href: `javascript:void(0)`,
          title: "Add",
        },
        i({ class: "fas fa-plus" })
      )
    );
  } else {
    return div(
      hdr.showIf
        ? {
            "data-show-if": mkShowIf(hdr.showIf),
          }
        : {},
      div(
        {
          class: `repeats-${hdr.form_name}`,
        },
        div(
          { class: `form-repeat form-namespace repeat-${hdr.form_name}` },
          repeater_icons,
          hdr.fields.map((f: any) => {
            return mkFormRowForField(v, errors, formStyle, labelCols, "_0")(f);
          })
        )
      ),
      adder
    );
  }
};

/**
 * @param hdr
 * @param name
 * @param v
 * @param extracls
 * @returns
 */
const displayEdit = (
  hdr: any,
  name: string,
  v: any,
  extracls: string,
  row: any
): any => {
  let fieldview: any;
  const attributes = hdr.attributes;
  if (hdr.disabled) attributes.disabled = true;
  if (hdr.fieldviewObj) {
    fieldview = hdr.fieldviewObj;
  } else if (hdr.fieldview && hdr.type && hdr.type.fieldviews[hdr.fieldview])
    fieldview = hdr.type.fieldviews[hdr.fieldview];
  else if (hdr.type && hdr.type.fieldviews) {
    const found = Object.entries(hdr.type.fieldviews).find(
      ([nm, fv]: [string, any]) => fv.isEdit
    );
    if (found) {
      fieldview = found[1];
    }
  }
  if (!fieldview) {
    if (hdr.typename === "FieldRepeat") return;
    if (!hdr.type)
      throw new Error(`Unknown type ${hdr.typename} in field ${name}`);
    else throw new Error(`Cannot find fieldview for field ${name}`);
  }
  if (fieldview.isEdit) {
    //use default if required
    const v_use =
      hdr.required &&
      typeof attributes.default !== "undefined" &&
      typeof v === "undefined"
        ? attributes.default
        : v;

    return fieldview.run(
      name,
      v_use,
      attributes,
      extracls + " " + hdr.class,
      hdr.required,
      hdr,
      row
    );
  } else return fieldview.run(v, undefined, attributes);
};

/**
 * @param v
 * @param errors
 * @param formStyle
 * @param labelCols
 * @param nameAdd
 * @returns
 */
const mkFormRowForField =
  (
    v: any,
    errors: any[],
    formStyle: string,
    labelCols: number,
    nameAdd: string = ""
  ): ((hdr: any) => string) =>
  (hdr: any): string => {
    const name: any = hdr.form_name + nameAdd;
    const errorFeedback = errors[name]
      ? div(
          {
            class: "invalid-feedback",
          },
          text(errors[name])
        )
      : "";
    if (hdr.input_type === "hidden" && hdr.showIf) {
      return span(
        { "data-show-if": mkShowIf(hdr.showIf) },
        innerField(v, errors, nameAdd)(hdr)
      );
    } else if (hdr.input_type === "hidden") {
      return innerField(v, errors, nameAdd)(hdr);
    } else
      return formRowWrap(
        hdr,
        innerField(
          v,
          errors,
          nameAdd,
          hdr.type?.name === "Bool" && formStyle === "vert"
            ? "form-check-input"
            : ""
        )(hdr),
        errorFeedback,
        formStyle,
        labelCols
      );
  };
const helpLink = ({ topic, context, dynContext, plugin }: any) => {
  let qs = "";
  Object.keys(context || {}).forEach((k) => {
    qs += `${encodeURIComponent(k)}=${encodeURIComponent(context[k])}&`;
  });
  const basepath = plugin ? `/admin/help-plugin/${plugin}` : "/admin/help";
  return a(
    {
      href: `javascript:ajax_modal('${basepath}/${topic}?${qs}')`,
      "data-dyn-href":
        !!dynContext &&
        `\`javascript:ajax_modal('${basepath}/${topic}?${qs}&${dynContext
          .map((k: string) => `${k}=\${${k}}`)
          .join("&")}')\``,
    },
    i({ class: "fas fa-question-circle ms-1" })
  );
};
const mkSubLabelAndHelp = (hdr: any) => {
  return (
    (hdr.sublabel ? i(hdr.sublabel) : "") +
    (hdr.help && hdr.sublabel ? helpLink(hdr.help) : "")
    //(hdr.help && !hdr.sublabel ? "Help" + helpLink(hdr.help) : "")
  );
};

/**
 * @param v
 * @param errors
 * @param formStyle
 * @param labelCols
 * @param nameAdd
 * @returns
 */
const mkFormRowAside = (
  v: any,
  errors: any[],
  formStyle: string,
  labelCols: number,
  nameAdd: string = "",
  hdr1: any,
  hdr2: any
): string => {
  const name: any = hdr1.form_name + nameAdd;

  const inner1 = innerField(v, errors, nameAdd, "")(hdr1);
  const inner2 = innerField(v, errors, nameAdd, "")(hdr2);
  const inputCols = (12 - labelCols * 2) / 2;
  const mkLabel = (hdr: any) =>
    label(
      {
        for: `input${text_attr(hdr.form_name)}`,
      },
      text(hdr.label),
      hdr.help && !hdr.sublabel ? helpLink(hdr.help) : ""
    );
  const outerAttributes = {
    class: ["form-group row"],
    "data-disabled": hdr1.disabled ? "true" : false,
    ...(hdr1.showIf && {
      style: "display: none;",
      "data-show-if": mkShowIf(hdr1.showIf),
    }),
  };

  if (formStyle === "vert")
    return div(
      outerAttributes,
      div(
        { class: `col-sm-6` },
        div(mkLabel(hdr1)),
        div(inner1, mkSubLabelAndHelp(hdr1))
      ),
      div(
        { class: `col-sm-6` },
        div(mkLabel(hdr2)),
        div(inner2, mkSubLabelAndHelp(hdr2))
      )
    );
  else
    return div(
      outerAttributes,
      div({ class: `col-sm-${labelCols} text-end` }, mkLabel(hdr1)),
      div({ class: `col-sm-${inputCols}` }, inner1, mkSubLabelAndHelp(hdr1)),
      div({ class: `col-sm-${labelCols} text-end` }, mkLabel(hdr2)),
      div({ class: `col-sm-${inputCols}` }, inner2, mkSubLabelAndHelp(hdr2))
    );

  /*formRowWrap(
    hdr,

    errorFeedback,
    formStyle,
    labelCols
  );*/
};

/**
 * @param form
 * @returns
 */
const renderFormLayout = (form: Form): string => {
  const blockDispatch: any = {
    join_field(segment: any) {
      if (segment.sourceURL)
        return div({
          class: segment.block ? "d-block" : "d-inline",
          "data-source-url": segment.sourceURL,
        });
      return "";
    },
    tabs(segment: any, go: any) {
      if (segment.tabsStyle !== "Value switch") return false;
      return segment.titles
        .map((t: any, ix: number) =>
          div(
            {
              style: "display: none;",
              "data-show-if": mkShowIf({
                [segment.field]: typeof t.value === "undefined" ? t : t.value,
              }),
            },
            go(segment.contents[ix])
          )
        )
        .join("");
    },
    field_repeat({ field_repeat }: any, go: any) {
      const hdr = field_repeat;

      return div(
        hdr.showIf
          ? {
              "data-show-if": mkShowIf(hdr.showIf),
            }
          : {},
        div(
          {
            class: `repeats-${hdr.form_name}`,
          },
          field_repeat.metadata?.rows && field_repeat.metadata?.rows.length > 0
            ? field_repeat.metadata.rows.map((row: any, ix: number) => {
                field_repeat.metadata.current_row = row;
                field_repeat.metadata.current_ix = ix;
                return div(
                  {
                    class: `form-repeat form-namespace repeat-${hdr.form_name}`,
                  },
                  repeater_icons,
                  go(field_repeat.layout),
                  field_repeat.fields
                    .filter(
                      (f: FieldLike) => f.input_type === "hidden" && f.name
                    )
                    .map((f: FieldLike) => innerField(row, [], `_${ix}`)(f))
                );
              })
            : div(
                { class: `form-repeat form-namespace repeat-${hdr.form_name}` },
                repeater_icons,
                go(field_repeat.layout)
              )
        ),
        repeater_adder(hdr.form_name)
      );

      //mkFormRowForRepeat({}, [], "", 3, field_repeat)
    },
    field(segment: any) {
      const [repeat_name, field_name] = segment.field_name.split(".");
      const in_repeat = !!field_name;
      const fields_match: any[] = segment.field_name.includes(".")
        ? (
            form.fields.find(
              (f) => f.name === repeat_name && (f as any).isRepeat
            ) as AbstractFieldRepeat
          )?.fields.filter((f: any) => f.name === field_name)
        : form.fields.filter((f) => f.name === segment.field_name);
      let field0;
      if (fields_match.length === 1) field0 = fields_match[0];
      if (fields_match.length > 1) {
        const samefv = fields_match.find(
          (f: any) => "fieldview" in f && f.fieldview === segment.fieldview
        );
        if (samefv) field0 = samefv;
        else field0 = fields_match[0];
      }

      const repeater = in_repeat
        ? form.fields.find((f) => f.name === repeat_name)
        : null;
      const field = { ...field0 };
      if (instanceOfField(field) && field.input_type !== "hidden") {
        if (field.sourceURL) return div({ "data-source-url": field.sourceURL });
        if (instanceOfField(field0)) field.form_name = field0.form_name;

        const errorFeedback = form.errors[field.name]
          ? div(
              {
                class: "invalid-feedback",
              },
              text(form.errors[field.name])
            )
          : "";
        if (segment.fieldview) field.fieldview = segment.fieldview;
        field.attributes = { ...field.attributes, ...segment.configuration };
        if (segment.onchange_action)
          field.attributes.onChange = `view_post(this, 'run_action', {onchange_action: '${segment.onchange_action}', onchange_field:'${field.name}',  ...get_form_record(this) })`;
        field.attributes.isMobile = !isNode || form.req?.smr;
        return (
          innerField(
            in_repeat
              ? (repeater as any)?.metadata?.current_row || {}
              : form.values,
            form.errors,
            in_repeat
              ? `_${(repeater as any)?.metadata?.current_ix || 0}`
              : undefined
          )(field) + errorFeedback
        );
      } else return "";
    },
    action({
      action_link,
      action_name,
      action_label,
      action_url,
      confirm,
      action_style,
      action_size,
      action_icon,
      configuration,
      action_bgcol,
      action_bordercol,
      action_textcol,
      spinner,
    }: any) {
      const isMobile = !isNode || form.req?.smr;
      let style =
        action_style === "btn-custom-color"
          ? `background-color: ${action_bgcol || "#000000"};border-color: ${
              action_bordercol || "#000000"
            }; color: ${action_textcol || "#000000"}`
          : null;
      const confirmStr = confirm
        ? `if(confirm('${form.req?.__?.("Are you sure?") || "Are you sure?"}'))`
        : "";
      const spinnerStr = spinner ? `spin_action_link(this);` : "";
      if (action_name && action_name.startsWith("Login with ")) {
        const method_label = action_name.replace("Login with ", "");
        const dest = form.req?.query?.dest
          ? `?dest=${encodeURIComponent(form.req.query.dest)}`
          : "";
        return a(
          {
            href: `/auth/login-with/${method_label}${dest}`,
            //TODO get url through form.req to reduce coupling
            class: [
              action_style !== "btn-link" &&
                `btn ${action_style || "btn-primary"} ${action_size || ""}`,
            ],
            style,
          },
          action_icon ? i({ class: action_icon }) + "&nbsp;" : false,
          action_label || action_name
        );
      }

      const mkBtn = (onclick_or_type: string) =>
        `<button ${onclick_or_type} class="${
          action_style === "btn-link"
            ? ""
            : `btn ${action_style || "btn-primary"} ${action_size || ""}`
        }"${style ? ` style="${style}"` : ""}${
          spinner && !onclick_or_type?.startsWith?.("on")
            ? ` onclick="spin_action_link(this)"`
            : ""
        }>${
          action_icon ? `<i class="${text(action_icon)}"></i>&nbsp;` : ""
        }${text(action_label || form.submitLabel || action_name || "Save")}</button>`;

      if (action_name === "Delete") {
        if (action_url) {
          const dest = configuration && configuration.after_delete_url;
          if (isNode && !form.req?.smr) {
            return mkBtn(
              `onClick="${spinnerStr}${confirmStr}ajax_post('${action_url}', {success:()=>{${
                form.req?.xhr ? `close_saltcorn_modal();` : ""
              }${
                dest
                  ? `window.location.href='${dest}';`
                  : form.req?.xhr
                    ? `location.reload();`
                    : `history.back();`
              }}})" type="button"`
            );
          } else {
            return mkBtn(
              `onClick="${spinnerStr}${confirmStr}local_post('${action_url}', {after_delete_url:'${
                dest || "/"
              }'})" type="button"`
            );
          }
        } else return "";
      }
      if (action_name === "Reset") {
        return mkBtn(
          `onClick="${spinnerStr}${confirmStr}reset_nearest_form(this)" type="button"`
        );
      }
      if (action_name === "Cancel") {
        return mkBtn(
          `onClick="${spinnerStr}${confirmStr}cancel_form($(this).closest('form'))" type="button"`
        );
      }
      if (action_name === "GoBack") {
        const isWeb = isNode && !form.req?.smr;
        const reload = configuration.reload_after ? "reload_on_init();" : "";
        const doNav =
          !configuration.steps || configuration.steps === 1
            ? isWeb
              ? "history.back()"
              : "parent.saltcorn.mobileApp.navigation.goBack()"
            : isWeb
              ? `history.go(${-1 * configuration.steps})`
              : `parent.saltcorn.mobileApp.navigation.goBack(${configuration.steps})`;
        if (configuration.save_first) {
          const complete = `()=>${doNav}`;
          return mkBtn(
            `onClick="${spinnerStr}${reload}saveAndContinueDelayed(this,${
              isMobile ? `'${form.action}', ${complete}` : complete
            })" type="button"`
          );
        } else
          return mkBtn(
            `onClick="${spinnerStr}${reload}${doNav}" type="button"`
          );
      }
      if (action_name === "SaveAndContinue") {
        return (
          mkBtn(
            `onClick="${spinnerStr}saveAndContinueDelayed(this,${
              isMobile ? `'${form.action}'` : undefined
            })" type="button"`
          ) +
          script(
            // cant use currentScript in callback
            `((myScript)=>{` +
              domReady(`
            $(myScript).closest('form').find('input').keydown(function (e) {
            if (e.keyCode == 13) {
                e.preventDefault();
                saveAndContinueDelayed(myScript,${
                  isMobile ? `'${form.action}'` : undefined
                });
                return false;
            }
        });`) +
              `})(document.currentScript)`
          )
        );
      }
      if (action_name === "UpdateMatchingRows")
        return mkBtn(
          `onClick="${spinnerStr}updateMatchingRows(this, '${form.viewname}')" type="button"`
        );
      if (action_name === "SubmitWithAjax")
        return mkBtn(
          `onClick="${spinnerStr}submitWithAjax(this)" type="button"`
        );

      if (action_name === "Login") {
        return mkBtn(
          `onClick="${spinnerStr}login_from_edit_view(event)" type="button"`
        );
      }
      if (action_name === "Sign up") {
        console.log("signup_from_edit_view", action_name);
        return mkBtn(
          `onClick="${spinnerStr}signup_from_edit_view(event)" type="button"`
        );
      }
      if (action_link) return action_link;

      if ((isNode && !form.req?.smr) || form.isWorkflow) {
        const submitAttr =
          form.xhrSubmit || form.isWorkflow
            ? `onClick="${spinnerStr}${
                form.onSubmit ? `${form.onSubmit};` : ""
              }ajaxSubmitForm(this, true)" type="button"`
            : 'type="submit"';
        return mkBtn(submitAttr);
      }
      return mkBtn('type="submit"');
    },
  };
  const role = form.req?.user?.role_id || 100;

  return renderLayout({
    blockDispatch,
    layout: form.layout,
    role,
    req: form.req,
    is_owner: form.isOwner,
    hints: form.req?.layout_hints,
  });
};

const splitSnippet = (form: Form) =>
  form.splitPaste
    ? script(
        { id: "splitPasteActivator" },
        domReady(
          `$("script#splitPasteActivator").closest('form').find('input').on('paste',split_paste_handler);`
        )
      )
    : "";

/**
 * @param form
 * @param csrfToken0
 * @returns
 */
const renderForm = (
  form: Form | string,
  csrfToken0: string | boolean
): string => {
  if (typeof form === "string") return form;

  const csrfToken =
    csrfToken0 === false || csrfToken0 === ""
      ? csrfToken0
      : csrfToken0 || (form.req && form.req.csrfToken && form.req.csrfToken());
  if (form.layout) return mkFormWithLayout(form, csrfToken);
  else return mkForm(form, csrfToken, form.errors);
};

/**
 * @param form
 * @param csrfToken
 * @returns
 */
const mkFormWithLayout = (form: Form, csrfToken: string | boolean): string => {
  const hasFile = form.fields.some(
    (f: any) =>
      f.multipartFormData ||
      (f.isRepeat && f.fields.some((f2: any) => f2.multipartFormData))
  );
  const csrfField = `<input type="hidden" name="_csrf" value="${csrfToken}">`;
  const extraValues: any = {};
  if (form.pk_name)
    if (!form.values[form.pk_name]) extraValues._creating = true;
    else extraValues._creating = false;
  if (form.req?.user) extraValues.user = form.req.user;
  if (form.pk_name)
    if (!form.values[form.pk_name]) extraValues._creating = true;
    else extraValues._creating = false;
  if (Object.keys(form.values || {}).length > 1) {
    const formVals = new Set(
      form.fields
        .filter((f: any) => {
          if (f.input_type === "hidden") return true;
          if (f.fieldviewObj) return f.fieldviewObj.isEdit;
          if (!f?.type?.fieldviews) return false;
          const fv = f.type.fieldviews[f.fieldview];
          if (!fv) return false;
          return fv.isEdit;
        })
        .map((f) => f.name)
    );
    Object.entries(form.values).forEach(([k, v]) => {
      if (!formVals.has(k)) extraValues[k] = v;
    });
  }
  const hasValues = Object.keys(extraValues).length > 0;
  const isMobile = !isNode || form.req?.smr;
  const mobileWorkflow = isMobile && form.isWorkflow;
  const top = `<form data-viewname="${
    form.viewname
  }" action="${buildActionAttribute(form)}"${
    form.onSubmit || form.xhrSubmit || mobileWorkflow
      ? ` onsubmit="${form.onSubmit || ""}${
          (form.xhrSubmit && !isMobile) || mobileWorkflow
            ? `;ajaxSubmitForm(this, true, event)`
            : ""
        }" `
      : ""
  }${
    form.onChange ? ` onchange="${form.onChange}"` : ""
  } class="form-namespace ${form.class || ""}" method="${
    form.methodGET ? "get" : "post"
  }"${hasFile ? ' encType="multipart/form-data" accept-charset="utf-8"' : ""}${
    hasValues
      ? ` data-row-values="${encodeURIComponent(JSON.stringify(extraValues))}"`
      : ""
  }${form.id ? ` id="${form.id}"` : ""}>`;
  const blurbp = form.blurb
    ? Array.isArray(form.blurb)
      ? form.blurb.join("")
      : p(text(form.blurb))
    : "";
  const hiddens = form.fields
    .filter((f: any) => f.input_type === "hidden")
    .map((f: any) => innerField(form.values, form.errors)(f))
    .join("");
  const fullFormError = form.errors._form
    ? `<div class="form-group row">
  <div class="col-sm-12">
  <p class="text-danger">${form.errors._form}
  </p>
  </div>
  </div>`
    : "";

  return (
    blurbp +
    top +
    csrfField +
    hiddens +
    renderFormLayout(form) +
    fullFormError +
    splitSnippet(form) +
    "</form>"
  );
};

/**
 * @param additionalButtons
 * @returns
 */
const displayAdditionalButtons = (
  additionalButtons: any[],
  afterSave?: boolean
): string =>
  additionalButtons
    .filter((btn) => !!btn.afterSave === !!afterSave)
    .map((btn) =>
      button(
        {
          type: "button",
          id: btn.id,
          class: `${btn.class}${afterSave ? " ms-2" : ""}`,
          ...(btn.onclick ? { onclick: btn.onclick } : {}),
          ...(btn.disabled ? { disabled: true } : {}),
        },
        text(btn.label)
      )
    )
    .join("&nbsp;");

const mkFormContentNoLayout = (form: Form, errors: any = {}) => {
  const tabHtmls: any = {};

  const fldHtmls: String[] = [];
  for (let i = 0; i < form.fields.length; i++) {
    const field: any = form.fields[i];
    let fldHtml;
    if ((field as any)?.attributes?.asideNext) {
      // console.log("AsideNext", field);

      fldHtml = mkFormRowAside(
        form.values,
        errors,
        form.formStyle,
        typeof form.labelCols === "undefined" ? 2 : form.labelCols,
        "",
        field,
        form.fields[i + 1]
      );
      i++;
    } else {
      fldHtml = mkFormRow(
        form.values,
        errors,
        form.formStyle,
        typeof form.labelCols === "undefined" ? 2 : form.labelCols
      )(field);
    }
    if (field.tab) {
      if (!tabHtmls[field.tab]) tabHtmls[field.tab] = [];
      tabHtmls[field.tab].push(fldHtml);
    } else fldHtmls.push(fldHtml);
  }
  const flds = fldHtmls.join("");
  const tabsHtml =
    Object.keys(tabHtmls).length > 0
      ? renderTabs(
          {
            contents: Object.values(tabHtmls),
            titles: Object.keys(tabHtmls),
            tabsStyle: form.tabs?.tabsStyle || "Tabs",
            independent: false,
            bodyClass: "mt-2",
            outerClass: "mb-3",
            startClosed: true,
          },
          (s) => s
        )
      : "";
  return flds + tabsHtml;
};

/**
 * @param form
 * @param csrfToken
 * @param errors
 * @returns
 */
const mkForm = (
  form: Form,
  csrfToken: string | boolean,
  errors: any = {}
): string => {
  const hasFile = form.fields.some((f: any) => f.multipartFormData);
  const isMobile = !isNode || form.req?.smr;
  const csrfField =
    csrfToken === false
      ? ""
      : `<input type="hidden" name="_csrf" value="${csrfToken}">`;
  const top = `<form data-viewname="${form.viewname}" ${
    form.id ? `id="${form.id}" ` : ""
  }action="${buildActionAttribute(form)}"${
    form.onSubmit || form.xhrSubmit
      ? ` onsubmit="${form.onSubmit || ""}${
          (form.xhrSubmit && !isMobile) || form.isWorkflow
            ? `;ajaxSubmitForm(this, true, event)`
            : ""
        }"`
      : ""
  } ${
    form.onChange ? ` onchange="${form.onChange}"` : ""
  }class="form-namespace ${form.class || ""}" method="${
    form.methodGET ? "get" : "post"
  }"${hasFile ? ' encType="multipart/form-data" accept-charset="utf-8"' : ""}>`;
  //console.log(form.fields);
  const content = mkFormContentNoLayout(form, errors);
  const blurbp = form.blurb
    ? Array.isArray(form.blurb)
      ? form.blurb.join("")
      : p(text(form.blurb))
    : "";
  const fullFormError = errors._form
    ? `<div class="form-group row">
  <div class="col-sm-12">
  <p class="text-danger">${errors._form}
  </p>
  </div>
  </div>`
    : "";
  const bot = `<div class="form-group row">
  ${form.formStyle !== "vert" ? `<div class="col-sm-${form.labelCols || 2}"></div>` : ""}
  <div class="col-sm-${form.formStyle === "vert" ? "12" : 12 - (form.labelCols || 2)}">
    ${
      form.additionalButtons
        ? displayAdditionalButtons(form.additionalButtons, false)
        : ""
    }
    ${
      form.noSubmitButton
        ? ""
        : form.xhrSubmit || form.isWorkflow
          ? `<button type="button" class="btn ${
              form.submitButtonClass || "btn-primary"
            }" onClick="${
              form.onSubmit ? `${form.onSubmit};` : ""
            }ajaxSubmitForm(this, true)">${text(
              form.submitLabel || "Save"
            )}</button>`
          : `<button type="submit" class="btn ${
              form.submitButtonClass || "btn-primary"
            }">${text(form.submitLabel || "Save")}</button>`
    }${
      form.additionalButtons
        ? displayAdditionalButtons(form.additionalButtons, true)
        : ""
    }
  </div>
</div>`;
  return (
    blurbp +
    top +
    csrfField +
    content +
    fullFormError +
    bot +
    splitSnippet(form) +
    "</form>"
  );
};

export = { renderForm, mkFormContentNoLayout, mkForm, renderFormLayout };
