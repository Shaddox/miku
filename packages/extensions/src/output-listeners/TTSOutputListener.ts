import * as Core from "@mikugg/core";
import { TTSServicePropTypes } from "../services/tts/TTSService";
import { InferProps } from "prop-types";
import { ServicesNames } from "../services";
import trim from "lodash.trim";

type TTSServiceProps = InferProps<typeof TTSServicePropTypes>;

export interface TTSOutputListenerParams {
  serviceEndpoint: string;
  readNonSpokenText: boolean;
  props: TTSServiceProps;
  signer: Core.Services.ServiceQuerySigner;
}

export class TTSOutputListener extends Core.OutputListeners.OutputListener<
  Core.OutputListeners.DialogOutputEnvironment,
  string
> {
  protected service: Core.Services.ServiceClient<TTSServiceProps, string>;
  protected props: TTSServiceProps;
  protected serviceName: string;
  protected readNonSpokenText: boolean;

  constructor(params: TTSOutputListenerParams, serviceName: ServicesNames) {
    super();
    this.props = params.props;
    this.service = new Core.Services.ServiceClient<TTSServiceProps, string>(
      params.serviceEndpoint,
      params.signer,
      serviceName
    );
    this.serviceName = serviceName;
    this.readNonSpokenText = params.readNonSpokenText;
  }

  protected override async handleOutput(
    output: Core.OutputListeners.DialogOutputEnvironment
  ): Promise<string> {
    if (this.serviceName != "") {      
      const prompt = this.readNonSpokenText
      ? output.text
      : this.cleanText(output.text);
      return this.service.query(
        {
          ...this.props,
          prompt,
        },
        await this.service.getQueryCost(this.props)
      );
    } else {
      return "";
    }
  }

  protected getResultOnError(
    output: Core.OutputListeners.DialogOutputEnvironment
  ): string {
    return "";
  }

  public override async getCost(): Promise<number> {
    return this.service.getQueryCost(this.props);
  }

  private cleanText(text: string) {
    // sanitize text
    text = text.replace(/\*(.*?)\*/g, "($1)");
    text = trim(text);
    if (text.startsWith('"') && text.endsWith('"'))
      text = text.substring(1, text.length - 1);
    text = " " + text;

    let cleanText = "";
    let lastOpen: undefined | string = undefined;
    for (let x = 0; x < text.length; x++) {
      const ch = text.charAt(x);
      const spaceBefore = x > 0 && text.charAt(x - 1) == " ";

      // if (lastOpen == '(' && ch == ')') {lastOpen = undefined; continue;}
      if (lastOpen == "[" && ch == "]") {
        lastOpen = undefined;
        continue;
      }
      if (lastOpen == "-" && ch == "-") {
        lastOpen = undefined;
        continue;
      }
      if (lastOpen == "*" && ch == "*") {
        lastOpen = undefined;
        continue;
      }

      // We require a space before these characters to avoid cases like "Oh-oh"
      // Where the character is part of the word.
      if (
        spaceBefore &&
        /*ch == '(' ||*/ (ch == "[" || ch == "-" || ch == "*")
      ) {
        lastOpen = ch;
        continue;
      }

      if (!lastOpen) {
        cleanText += ch;
      }
    }
    cleanText.replace(/ *\([^)]*\) */g, "");

    return cleanText;
  }
}
