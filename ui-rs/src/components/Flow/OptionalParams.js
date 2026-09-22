import React, { useState } from 'react';
import { useForm } from 'react-final-form';
import { Button, Col, Row } from '@folio/stripes/components';

const OptionalParams = ({ params }) => {
  const [open, setOpen] = useState({});
  const form = useForm();

  const toggle = name => {
    // Final Form retains unmounted values, so clear a field when hiding it.
    if (open[name]) form.change(name, undefined);
    setOpen(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const shown = params.filter(({ name }) => open[name]);

  return (
    <>
      <Row>
        <Col xs={12}>
          {params.map(({ name, label, openLabel }) => (
            <Button key={name} onClick={() => toggle(name)} aria-expanded={!!open[name]}>
              {/* \u2212 (minus) is the same width and sits on the same baseline as + in most fonts */}
              <span aria-hidden="true">{open[name] ? '\u2212' : '+'}&nbsp;</span>
              {open[name] ? openLabel : label}
            </Button>
          ))}
        </Col>
      </Row>
      {shown.length > 0 &&
        <Row>
          {shown.map(({ name, field }) => <Col xs={6} key={name}>{field}</Col>)}
        </Row>
      }
    </>
  );
};

export default OptionalParams;
