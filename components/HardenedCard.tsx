import type {ElementType,HTMLAttributes,ReactNode} from 'react';

type Props={
  as?:ElementType;
  children:ReactNode;
  className?:string;
  summaryLines?:2|3|4;
  titleLines?:1|2|3;
} & HTMLAttributes<HTMLElement>;

export default function HardenedCard({as:Tag='article',children,className='',summaryLines=3,titleLines=2,...props}:Props){
  return <Tag
    {...props}
    className={`metteloHardenedCard ${className}`.trim()}
    data-summary-lines={summaryLines}
    data-title-lines={titleLines}
  >{children}</Tag>;
}
