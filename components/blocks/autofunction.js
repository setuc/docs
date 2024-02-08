import React, { useEffect, useState, useRef } from "react";
import reverse from "lodash/reverse";
import classNames from "classnames";
import Table from "./table";
import { H2 } from "./headers";
import Warning from "./warning";
import Deprecation from "./deprecation";
import { withRouter, useRouter } from "next/router";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/plugins/line-numbers/prism-line-numbers";
import "prismjs/plugins/line-highlight/prism-line-highlight";
import "prismjs/plugins/line-highlight/prism-line-highlight.css";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";
import "prismjs/plugins/normalize-whitespace/prism-normalize-whitespace";

import styles from "./autofunction.module.css";
import { name } from "file-loader";

const cleanHref = (name) => {
  return String(name).replace(/\./g, "").replace(/\s+/g, "-");
};

const Autofunction = ({
  version,
  versions,
  streamlitFunction,
  streamlit,
  slug,
  hideHeader,
  deprecated,
  deprecatedText,
}) => {
  const blockRef = useRef();
  const router = useRouter();
  const maxVersion = versions[versions.length - 1];
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(
    version ? version : versions[versions.length - 1],
  );

  useEffect(() => {
    highlightWithPrism();
    regenerateIframes();
  }, [streamlitFunction]);

  // Code to destroy and regenerate iframes on each new autofunction render.
  const regenerateIframes = () => {
    const iframes = Array.prototype.slice.call(
      blockRef.current.getElementsByTagName("iframe"),
    );
    if (!iframes) return;

    iframes.forEach((iframe) => {
      const parent = iframe.parentElement;
      const newFrame = iframe.cloneNode();

      newFrame.src = "";
      newFrame.classList.add("new");
      newFrame.src = iframe.src;

      parent.replaceChild(newFrame, iframe);
    });
  };

  const highlightWithPrism = () => {
    if (isHighlighted) {
      return;
    }
    if (!blockRef.current) {
      return;
    }

    const pres = Array.prototype.slice.call(
      blockRef.current.getElementsByTagName("pre"),
    );

    pres.forEach((ele) => {
      const codeText = ele.innerHTML;
      const preTag = ele.cloneNode(true);
      const codeWrap = document.createElement("div");
      codeWrap.setAttribute("class", styles.CodeBlockContainer);
      const codeTag = document.createElement("code");
      codeTag.setAttribute("class", "language-python");
      preTag.classList.add("line-numbers");
      codeTag.innerHTML = codeText;
      preTag.textContent = null;
      preTag.appendChild(codeTag);
      codeWrap.appendChild(preTag);
      ele.replaceWith(codeWrap);
    });

    Prism.highlightAllUnder(blockRef.current);

    setIsHighlighted(true);
  };

  const VersionSelector = ({
    versionList,
    currentVersion,
    handleSelectVersion,
  }) => {
    const isSiS = currentVersion.startsWith("SiS") ? true : false;
    const selectClass = isSiS
      ? "version-select sis-version"
      : currentVersion !== versionList[0]
        ? "version-select old-version"
        : "version-select";

    return (
      <form className={classNames(selectClass, styles.Form)}>
        <label>
          <span className="sr-only">Streamlit Version</span>
          <select
            value={currentVersion}
            onChange={handleSelectVersion}
            className={styles.Select}
          >
            {versionList.map((version, index) => (
              <option value={version} key={version}>
                {version == "SiS"
                  ? "Streamlit in Snowflake"
                  : version.startsWith("SiS.")
                    ? version.replace("SiS.", "Streamlit in Snowflake ")
                    : "Version " + version}
              </option>
            ))}
          </select>
        </label>
      </form>
    );
  };

  const handleSelectVersion = (event) => {
    const functionObject = streamlit[streamlitFunction];
    const slicedSlug = slug.slice();

    if (event.target.value !== currentVersion) {
      setCurrentVersion(event.target.value);
      if (event.target.value !== maxVersion) {
        let isnum = /^[\d\.]+$/.test(slicedSlug[0]);
        let isSiS = /^SiS[\d\.]*$/.test(slicedSlug[0]);
        if (isnum || isSiS) {
          slicedSlug[0] = event.target.value;
        } else {
          slicedSlug.unshift(event.target.value);
        }
        slug.unshift(event.target.value);
      }
    }

    if (!functionObject) {
      router.push(`/${slicedSlug.join("/")}`);
    } else {
      const name = cleanHref(`st.${functionObject.name}`);
      router.push(`/${slicedSlug.join("/")}#${name} `);
    }
  };

  const footers = [];
  const args = [];
  const kwargs = [];
  const returns = [];
  const versionList = reverse(versions.slice());
  let functionObject;
  let functionDescription;
  let header;
  let body;
  let isClass;
  let methods = [];
  let properties = [];

  if (streamlitFunction in streamlit) {
    functionObject = streamlit[streamlitFunction];
    isClass = functionObject.is_class;
    if (
      functionObject.description !== undefined &&
      functionObject.description
    ) {
      functionDescription = { __html: functionObject.description };
    }
  } else {
    return (
      <div className={styles.HeaderContainer}>
        <div className={styles.TitleContainer} ref={blockRef} key={slug}>
          <H2
            className={`
              ${styles.Title}
              relative
            `}
          >
            <a
              aria-hidden="true"
              tabIndex="-1"
              href={`#${cleanHref(
                streamlitFunction.replace("streamlit", "st"),
              )}`.toLowerCase()}
              className="absolute"
            >
              <span className="icon icon-link"></span>
            </a>
            {streamlitFunction.replace("streamlit", "st")}
          </H2>
          <VersionSelector
            versionList={versionList}
            currentVersion={currentVersion}
            handleSelectVersion={handleSelectVersion}
          />
        </div>
        <Warning>
          {version && version.startsWith("SiS") ? (
            <p>This method does not exist in Streamlit in Snowflake.</p>
          ) : (
            <p>
              This method did not exist in version <code>{currentVersion}</code>{" "}
              of Streamlit.
            </p>
          )}
        </Warning>
      </div>
    );
  }

  if ("methods" in functionObject) {
    methods = functionObject.methods;
  }

  if ("properties" in functionObject) {
    properties = functionObject.properties;
  }

  if (hideHeader !== undefined && hideHeader) {
    header = "";
  } else {
    const functionName = functionObject.signature
      ? `${functionObject.signature}`.split("(")[0].replace("streamlit", "st")
      : "";
    const name =
      String(functionObject.name).startsWith("html") ||
      String(functionObject.name).startsWith("iframe")
        ? `st.components.v1.${functionObject.name}`
        : functionName;
    header = (
      <div className={styles.HeaderContainer}>
        <div
          className={`
            ${styles.TitleContainer}
            relative
          `}
        >
          <H2 className={styles.Title}>
            <a
              aria-hidden="true"
              tabIndex="-1"
              href={`#${cleanHref(name)}`.toLowerCase()}
              className="absolute"
            >
              <span className="icon icon-link"></span>
            </a>
            {name}
          </H2>
          <VersionSelector
            versionList={versionList}
            currentVersion={currentVersion}
            handleSelectVersion={handleSelectVersion}
          />
        </div>
        {deprecated === true ? (
          <Deprecation>
            <p dangerouslySetInnerHTML={{ __html: deprecatedText }} />
          </Deprecation>
        ) : (
          ""
        )}
        <div
          className="code-desc"
          dangerouslySetInnerHTML={functionDescription}
        />
      </div>
    );
  }

  if ("example" in functionObject) {
    footers.push({ title: "Example", body: functionObject.example });
  }

  if ("examples" in functionObject) {
    footers.push({ title: "Examples", body: functionObject.examples });
  }

  if ("notes" in functionObject) {
    footers.push({ title: "Notes", body: functionObject.notes });
  }

  if ("warning" in functionObject) {
    footers.push({ title: "Warning", body: functionObject.warning });
  }

  // propertiesRows is initialized early to allow "Parameters" in any class
  // docstring to be diverted to the properties section. Docstring parsing
  // needs modification to first recognize "Attributes" or "Properites" then
  // parse their contents.
  let propertiesRows = [];

  for (const index in functionObject.args) {
    const row = {};
    const param = functionObject.args[index];
    const description = param.description
      ? param.description
      : `<p>No description</p> `;

    if (param.is_optional) {
      row["title"] = `
          <p>
            ${param.name}
            <span class='italic code'>(${param.type_name})</span>
          </p> `;
      row["body"] = `
        ${description}
      `;
    } else {
      row["title"] = `
          <p>
            <span class='bold'>${param.name}</span>
            <span class='italic code'>(${param.type_name})</span>
          </p>`;
      row["body"] = `
        ${description}
      `;
    }
    // When "Parameters" are included in a class docstring, they are actually
    // "Properties." Using "Properties" in the docstring does not result in
    // individually parsed properties; using "Parameters" is a workaround.
    if (isClass) {
      propertiesRows.push(row);
    } else if (param.is_kwarg_only) {
      kwargs.push(row);
    } else {
      args.push(row);
    }
  }

  let methodRows = [];

  for (const index in methods) {
    const row = {};
    const method = methods[index];
    const slicedSlug = slug.slice().join("/");
    const hrefName = `${functionObject.name}.${method.name}`
      .toLowerCase()
      .replace("streamlit", "st")
      .replace(/[.,\/#!$%\^&\*;:{}=\-`~()]/g, "");
    const type_name = method.signature
      ? method.signature.match(/\((.*)\)/)[1]
      : "";
    const description = method.description
      ? method.description
      : `<p>No description</p> `;
    // Add a link to the method by appending the method name to the current URL using slug.slice();
    row["title"] = `
    <p>
      <a href="/${slicedSlug}#${hrefName}"><span class='bold'>${method.name}</span></a><span class='italic code'>(${type_name})</span>
    </p>`;
    row["body"] = `${description}`;

    methodRows.push(row);
  }

  for (const index in properties) {
    const row = {};
    const property = properties[index];
    const slicedSlug = slug.slice().join("/");
    const hrefName = `${functionObject.name}.${property.name}`
      .toLowerCase()
      .replace("streamlit", "st")
      .replace(/[.,\/#!$%\^&\*;:{}=\-`~()]/g, "");
    const description = property.description
      ? property.description
      : `<p>No description</p> `;
    // Add a link to the method by appending the method name to the current URL using slug.slice();
    row["title"] = `
    <p>
      <a href="/${slicedSlug}#${hrefName}"><span class='bold'>${property.name}</span>
    </p>`;
    row["body"] = `${description}`;
    propertiesRows.push(row);
  }

  for (const index in functionObject.returns) {
    const row = {};
    const param = functionObject.returns[index];
    const description = param.description
      ? param.description
      : `<p>No description</p> `;

    row["title"] =
      `<p><span class='italic code'>(${param.type_name})</span></p> `;
    row["body"] = `${description} `;

    returns.push(row);
  }

  body = (
    <Table
      head={{
        title: (
          <>
            {isClass ? "Class description" : "Function signature"}
            <a
              className={styles.Title.a}
              href={functionObject.source}
              target="_blank"
              rel="noopener noreferrer"
              title={
                "View st." + functionObject.name + " source code on GitHub"
              }
            >
              [source]
            </a>
          </>
        ),
        content: `<p class='code'> ${functionObject.signature}</p> `,
      }}
      body={args.length ? { title: "Parameters" } : null}
      bodyRows={args.length ? args : null}
      foot={[
        kwargs.length ? { title: "Keyword-only parameters" } : null,
        methods.length ? { title: "Methods" } : null,
        returns.length ? { title: "Returns" } : null,
        propertiesRows.length ? { title: "Attributes" } : null,
      ].filter((section) => section !== null)}
      footRows={[
        kwargs.length ? kwargs : null,
        methods.length ? methodRows : null,
        returns.length ? returns : null,
        propertiesRows.length ? propertiesRows : null,
      ].filter((rows) => rows !== null)}
      additionalClass="full-width"
      footers={footers}
    />
  );

  return (
    <section className={styles.Container} ref={blockRef} key={slug}>
      {header}
      {body}
    </section>
  );
};

export default withRouter(Autofunction);
